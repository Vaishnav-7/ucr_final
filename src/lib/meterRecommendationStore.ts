/**
 * Global store for P&E meter recommendation messages.
 * Persisted in Supabase (meter_recommendations table).
 */

import { supabase } from "@/integrations/supabase/client";

export interface PowerMeterRow {
  make: string;
  model: string;
  conn: string;
  ct: string;
  remark: string;
}

const DEFAULT_ROWS: PowerMeterRow[] = [
  { make: "Saral", model: "Saral -305", conn: "1-phase", ct: "NO", remark: "For Load below 60 Amps" },
  { make: "Secure", model: "Sprint 350", conn: "3-phase", ct: "NO", remark: "For load below 60 Amps" },
  { make: "Secure", model: "Elite 440/445", conn: "3-phase", ct: "YES", remark: "For load above 60A" },
  { make: "Schneider Electric", model: "EM6400NG/Regor", conn: "3-phase", ct: "YES", remark: "For load above 60A" },
  { make: "L&T", model: "WL4405", conn: "3-phase", ct: "YES", remark: "For load above 60A" },
];
const DEFAULT_POWER_NOTE =
  "Before procuring Energy meters, Approval to be taken from P&E Department.";
const DEFAULT_WATER =
  "Only pulse enabled (AMR Compatibility) water meters to be installed to support Automated Meter Reading.";

let powerMeterRows: PowerMeterRow[] = DEFAULT_ROWS;
let powerFooterNote: string = DEFAULT_POWER_NOTE;
let waterRecommendation: string = DEFAULT_WATER;
let configId: string | null = null;
let loaded = false;

let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

/** Load from Supabase on first access */
async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const { data, error } = await supabase
      .from("meter_recommendations")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load meter recommendations:", error);
      return;
    }
    if (data) {
      configId = data.id;
      powerMeterRows = (data.power_meter_rows as unknown as PowerMeterRow[]) ?? DEFAULT_ROWS;
      powerFooterNote = data.power_footer_note ?? DEFAULT_POWER_NOTE;
      waterRecommendation = data.water_recommendation ?? DEFAULT_WATER;
      notify();
    }
  } catch (e) {
    console.error("Failed to load meter recommendations:", e);
  }
}

// Kick off loading immediately
ensureLoaded();

async function persistToDb() {
  try {
    if (configId) {
      await supabase
        .from("meter_recommendations")
        .update({
          power_meter_rows: powerMeterRows as unknown as Record<string, unknown>[],
          power_footer_note: powerFooterNote,
          water_recommendation: waterRecommendation,
          updated_at: new Date().toISOString(),
        })
        .eq("id", configId);
    } else {
      const { data } = await supabase
        .from("meter_recommendations")
        .insert({
          power_meter_rows: powerMeterRows as unknown as Record<string, unknown>[],
          power_footer_note: powerFooterNote,
          water_recommendation: waterRecommendation,
        })
        .select("id")
        .single();
      if (data) configId = data.id;
    }
  } catch (e) {
    console.error("Failed to save meter recommendations:", e);
  }
}

export function getPowerMeterRows(): PowerMeterRow[] {
  return powerMeterRows;
}

export function setPowerMeterRows(rows: PowerMeterRow[]) {
  powerMeterRows = rows;
  notify();
  persistToDb();
}

export function getPowerFooterNote(): string {
  return powerFooterNote;
}

export function setPowerFooterNote(note: string) {
  powerFooterNote = note;
  notify();
  persistToDb();
}

export function getWaterRecommendation(): string {
  return waterRecommendation;
}

export function setWaterRecommendation(msg: string) {
  waterRecommendation = msg;
  notify();
  persistToDb();
}

/** @deprecated kept for compatibility */
export function getPowerRecommendation(): string {
  return powerFooterNote;
}
/** @deprecated */
export function setPowerRecommendation(msg: string) {
  setPowerFooterNote(msg);
}
/** @deprecated */
export function getMeterRecommendation(): string {
  return powerFooterNote;
}
/** @deprecated */
export function setMeterRecommendation(msg: string) {
  setPowerFooterNote(msg);
}

export function subscribeMeterRecommendation(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
