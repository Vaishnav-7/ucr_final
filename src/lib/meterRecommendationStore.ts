/**
 * Global store for P&E meter recommendation messages.
 * Separate messages for Power and Water, editable by P&E staff.
 */

export interface PowerMeterRow {
  make: string;
  model: string;
  conn: string;
  ct: string;
  remark: string;
}

const ROWS_KEY = "meter-rec-power-rows";
const POWER_NOTE_KEY = "meter-rec-power-note";
const WATER_KEY = "meter-rec-water";

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

function loadJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function loadString(key: string, fallback: string): string {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  } catch {
    /* ignore */
  }
}

let powerMeterRows: PowerMeterRow[] = loadJSON(ROWS_KEY, DEFAULT_ROWS);
let powerFooterNote: string = loadString(POWER_NOTE_KEY, DEFAULT_POWER_NOTE);
let waterRecommendation: string = loadString(WATER_KEY, DEFAULT_WATER);

let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export function getPowerMeterRows(): PowerMeterRow[] {
  return powerMeterRows;
}

export function setPowerMeterRows(rows: PowerMeterRow[]) {
  powerMeterRows = rows;
  save(ROWS_KEY, rows);
  notify();
}

export function getPowerFooterNote(): string {
  return powerFooterNote;
}

export function setPowerFooterNote(note: string) {
  powerFooterNote = note;
  save(POWER_NOTE_KEY, note);
  notify();
}

export function getWaterRecommendation(): string {
  return waterRecommendation;
}

export function setWaterRecommendation(msg: string) {
  waterRecommendation = msg;
  save(WATER_KEY, msg);
  notify();
}

/** @deprecated kept for compatibility */
export function getPowerRecommendation(): string {
  return powerFooterNote;
}
/** @deprecated */
export function setPowerRecommendation(msg: string) {
  powerFooterNote = msg;
  save(POWER_NOTE_KEY, msg);
  notify();
}
/** @deprecated */
export function getMeterRecommendation(): string {
  return powerFooterNote;
}
/** @deprecated */
export function setMeterRecommendation(msg: string) {
  powerFooterNote = msg;
  save(POWER_NOTE_KEY, msg);
  notify();
}

export function subscribeMeterRecommendation(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
