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

let powerMeterRows: PowerMeterRow[] = [
  { make: "Saral", model: "Saral -305", conn: "1-phase", ct: "NO", remark: "For Load below 60 Amps" },
  { make: "Secure", model: "Sprint 350", conn: "3-phase", ct: "NO", remark: "For load below 60 Amps" },
  { make: "Secure", model: "Elite 440/445", conn: "3-phase", ct: "YES", remark: "For load above 60A" },
  { make: "Schneider Electric", model: "EM6400NG/Regor", conn: "3-phase", ct: "YES", remark: "For load above 60A" },
  { make: "L&T", model: "WL4405", conn: "3-phase", ct: "YES", remark: "For load above 60A" },
];

let powerFooterNote =
  "Before procuring Energy meters, Approval to be taken from P&E Department.";

let waterRecommendation =
  "Only pulse enabled (AMR Compatibility) water meters to be installed to support Automated Meter Reading.";

let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export function getPowerMeterRows(): PowerMeterRow[] {
  return powerMeterRows;
}

export function setPowerMeterRows(rows: PowerMeterRow[]) {
  powerMeterRows = rows;
  notify();
}

export function getPowerFooterNote(): string {
  return powerFooterNote;
}

export function setPowerFooterNote(note: string) {
  powerFooterNote = note;
  notify();
}

export function getWaterRecommendation(): string {
  return waterRecommendation;
}

export function setWaterRecommendation(msg: string) {
  waterRecommendation = msg;
  notify();
}

/** @deprecated kept for compatibility */
export function getPowerRecommendation(): string {
  return powerFooterNote;
}
/** @deprecated */
export function setPowerRecommendation(msg: string) {
  powerFooterNote = msg;
  notify();
}
/** @deprecated */
export function getMeterRecommendation(): string {
  return powerFooterNote;
}
/** @deprecated */
export function setMeterRecommendation(msg: string) {
  powerFooterNote = msg;
  notify();
}

export function subscribeMeterRecommendation(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
