import type { WorkflowAction } from "@/components/WorkflowActionModal";

export type WorkflowType =
  | "power-regular"
  | "power-temporary"
  | "power-prepaid"
  | "water"
  | "water-existing-meter"
  | "water-no-meter";

export type PowerConnectionType = "postpaid" | "prepaid" | "temporary";
export type WaterConnectionType = "existing" | "new";

/**
 * Determine the correct workflow type based on user-selected connection type.
 * No space master — user picks the type directly.
 */
export function resolveWorkflowType(
  utility: "power" | "water",
  connectionType?: string
): WorkflowType {
  if (utility === "water") {
    if (connectionType === "new") return "water-no-meter";
    return "water-existing-meter";
  }

  // Power
  if (connectionType === "temporary") return "power-temporary";
  if (connectionType === "prepaid") return "power-prepaid";
  return "power-regular";
}

export interface WorkflowStage {
  id: string;
  label: string;
  userActionRequired: boolean;
  actions?: WorkflowAction[];
}

const SD_UPLOAD_ACTION: WorkflowAction = {
  label: "Upload SD Payment Proof",
  type: "upload",
  fields: [
    { name: "payment_proof", label: "Security Deposit Payment Proof", type: "file" },
    { name: "transaction_id", label: "Transaction Reference ID", type: "text" },
  ],
};

const METER_ACTIONS: WorkflowAction[] = [
  {
    label: "Upload Calibration Certificate",
    type: "upload",
    fields: [{ name: "calibration_cert", label: "Calibration Certificate", type: "file" }],
  },
];

const SITE_VISIT_FORM_ACTION: WorkflowAction = {
  label: "Site Visit Form",
  type: "confirm",
  fields: [
    { name: "category_tariff", label: "Category", type: "select", options: ["33kV", "11kV", "415V", "230V"] },
    { name: "details_of_load", label: "Details of Load", type: "text" },
    { name: "meter_type", label: "Meter Type", type: "select", options: ["3-PHASE", "1-PHASE"] },
    { name: "meter_make", label: "Meter Make", type: "select", options: ["Saral", "Secure", "Schneider Electric", "L&T", "Other"] },
    { name: "meter_make_other", label: "Meter Make (Other)", type: "text", showWhen: { field: "meter_make", value: "Other" } },
    { name: "meter_serial_no", label: "Meter Serial No.", type: "text" },
    { name: "meter_calibration_date", label: "Meter Calibration Date", type: "date" },
    { name: "meter_opening_reading", label: "Meter Opening Reading", type: "number" },
    { name: "authorized_signatory", label: "Authorized Signatory (P&E)", type: "text", autoValue: "P&E Officer" },
    { name: "meter_photo", label: "Meter Photo", type: "file" },
  ],
};

/** Generate water site visit form fields dynamically per meter type */
function waterMeterFields(prefix: string, label: string) {
  return [
    { name: `${prefix}_serial_no`, label: `${label} Meter Serial Number`, type: "text" as const },
    { name: `${prefix}_initial_reading`, label: `${label} Initial Reading`, type: "number" as const },
    { name: `${prefix}_meter_make`, label: `${label} Meter Make`, type: "select" as const, options: ["Saral", "Secure", "Schneider Electric", "L&T", "Other"] },
    { name: `${prefix}_meter_make_other`, label: `${label} Meter Make (Other)`, type: "text" as const, showWhen: { field: `${prefix}_meter_make`, value: "Other" } },
    { name: `${prefix}_calibration`, label: `${label} Calibration Validation`, type: "select" as const, options: ["Valid", "Invalid", "Expired"] },
  ];
}

const WATER_SITE_VISIT_FORM_ACTION: WorkflowAction = {
  label: "Water Site Visit Form",
  type: "confirm",
  fields: [
    ...waterMeterFields("domestic", "Domestic"),
    ...waterMeterFields("flushing", "Flushing"),
    ...waterMeterFields("ro", "RO"),
    { name: "calibration_remarks", label: "Calibration Remarks", type: "textarea" },
    { name: "authorized_signatory", label: "Authorized Signatory (P&E)", type: "text", autoValue: "P&E Officer" },
  ],
};

/** Build dynamic water meter upload actions based on demand categories */
export function getWaterMeterUploadActions(waterDemand?: { domesticKL: number; flushingKL: number; roKL: number }): WorkflowAction[] {
  const actions: WorkflowAction[] = [];
  if (!waterDemand) {
    // fallback: single generic upload
    return [{ label: "Upload Calibration Certificate", type: "upload", fields: [{ name: "calibration_cert", label: "Calibration Certificate", type: "file" }] }];
  }
  if (waterDemand.domesticKL > 0) {
    actions.push({ label: "Upload Domestic Meter Certificate", type: "upload", fields: [{ name: "domestic_calibration_cert", label: "Domestic Water Meter Calibration Certificate", type: "file" }] });
  }
  if (waterDemand.flushingKL > 0) {
    actions.push({ label: "Upload Flushing Meter Certificate", type: "upload", fields: [{ name: "flushing_calibration_cert", label: "Flushing Water Meter Calibration Certificate", type: "file" }] });
  }
  if (waterDemand.roKL > 0) {
    actions.push({ label: "Upload RO Meter Certificate", type: "upload", fields: [{ name: "ro_calibration_cert", label: "RO Water Meter Calibration Certificate", type: "file" }] });
  }
  return actions.length > 0 ? actions : [{ label: "Upload Calibration Certificate", type: "upload", fields: [{ name: "calibration_cert", label: "Calibration Certificate", type: "file" }] }];
}

/** Build dynamic water site visit form based on demand categories */
export function getWaterSiteVisitActions(waterDemand?: { domesticKL: number; flushingKL: number; roKL: number }): WorkflowAction {
  if (!waterDemand) return WATER_SITE_VISIT_FORM_ACTION;
  const fields: WorkflowAction["fields"] = [];
  if (waterDemand.domesticKL > 0) fields.push(...waterMeterFields("domestic", "Domestic"));
  if (waterDemand.flushingKL > 0) fields.push(...waterMeterFields("flushing", "Flushing"));
  if (waterDemand.roKL > 0) fields.push(...waterMeterFields("ro", "RO"));
  if (fields.length === 0) fields.push(...waterMeterFields("domestic", "Domestic")); // fallback
  fields.push(
    { name: "calibration_remarks", label: "Calibration Remarks", type: "textarea" },
    { name: "authorized_signatory", label: "Authorized Signatory (P&E)", type: "text", autoValue: "P&E Officer" },
  );
  return { label: "Water Site Visit Form", type: "confirm", fields };
}

const NON_METERED_SITE_VISIT_FORM_ACTION: WorkflowAction = {
  label: "Site Visit Form",
  type: "confirm",
  fields: [
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
};

const EXPIRY_ACTIONS: WorkflowAction[] = [
  {
    label: "Request Extension",
    type: "confirm",
    fields: [
      { name: "new_end_date", label: "Requested New End Date", type: "date" },
      { name: "reason", label: "Reason for Extension", type: "textarea" },
      { name: "amended_po", label: "Amended PO (if applicable)", type: "file" },
    ],
  },
  {
    label: "Request Deactivation",
    type: "confirm",
    fields: [{ name: "reason", label: "Reason for Deactivation", type: "textarea" }],
  },
];

export const WORKFLOWS: Record<WorkflowType, WorkflowStage[]> = {
  "power-regular": [
    { id: "submitted", label: "Submitted", userActionRequired: false },
    { id: "spoc-approval", label: "SPOC Approval", userActionRequired: false },
    { id: "sd-decision", label: "SD Decision", userActionRequired: false },
    { id: "sd-payment", label: "SD Payment", userActionRequired: true, actions: [SD_UPLOAD_ACTION] },
    { id: "finance-confirms", label: "SD Verification", userActionRequired: false },
    { id: "customer-meter-upload", label: "Meter Purchase & Calibration", userActionRequired: true, actions: METER_ACTIONS },
    { id: "calibration-uploaded", label: "Calibration Certificate Uploaded", userActionRequired: false },
    { id: "slotting", label: "Slotting", userActionRequired: false },
    { id: "site-visit-form", label: "Site Visit Form", userActionRequired: false, actions: [SITE_VISIT_FORM_ACTION] },
    { id: "activated", label: "Connection Activated", userActionRequired: false },
  ],
  "power-prepaid": [
    { id: "submitted", label: "Submitted", userActionRequired: false },
    { id: "spoc-approval", label: "SPOC Approval", userActionRequired: false },
    { id: "slotting", label: "Slot Selection (P&E)", userActionRequired: false },
    { id: "site-visit-form", label: "Site Visit Form", userActionRequired: false, actions: [NON_METERED_SITE_VISIT_FORM_ACTION] },
    { id: "activated", label: "Connection Activated", userActionRequired: false },
  ],
  "power-temporary": [
    { id: "submitted", label: "Submitted", userActionRequired: false },
    { id: "sd-calculation", label: "SD Calculation", userActionRequired: false },
    { id: "sd-payment", label: "SD Payment", userActionRequired: true, actions: [SD_UPLOAD_ACTION] },
    { id: "finance-confirms", label: "SD Verification", userActionRequired: false },
    { id: "meter-recommendation", label: "Meter Recommendation", userActionRequired: true, actions: METER_ACTIONS },
    { id: "calibration-uploaded", label: "Calibration Certificate Uploaded", userActionRequired: false },
    { id: "slotting", label: "Slotting", userActionRequired: false },
    { id: "site-visit-form", label: "Site Visit Form", userActionRequired: false, actions: [SITE_VISIT_FORM_ACTION] },
    { id: "activated", label: "Temp Activated", userActionRequired: false },
  ],
  "water-existing-meter": [
    { id: "submitted", label: "Submitted", userActionRequired: false },
    { id: "spoc-approval", label: "SPOC Approval", userActionRequired: false },
    { id: "slotting", label: "Slot Selection (P&E)", userActionRequired: false },
    { id: "site-visit-form", label: "Water Site Visit Form", userActionRequired: false, actions: [WATER_SITE_VISIT_FORM_ACTION] },
    { id: "activated", label: "Water Activated", userActionRequired: false },
  ],
  "water-no-meter": [
    { id: "submitted", label: "Submitted", userActionRequired: false },
    { id: "spoc-approval", label: "SPOC Approval", userActionRequired: false },
    { id: "meter-purchase", label: "Meter Purchase Proof", userActionRequired: true, actions: [{ label: "Upload Calibration Certificate", type: "upload", fields: [{ name: "calibration_cert", label: "Calibration Certificate", type: "file" }] }] },
    { id: "calibration-uploaded", label: "Calibration Certificate Uploaded", userActionRequired: false },
    { id: "slotting", label: "Schedule Site Visit (P&E)", userActionRequired: false },
    { id: "site-visit-form", label: "Water Site Visit Form", userActionRequired: false, actions: [WATER_SITE_VISIT_FORM_ACTION] },
    { id: "activated", label: "Water Activated", userActionRequired: false },
  ],
  water: [
    { id: "submitted", label: "Submitted", userActionRequired: false },
    { id: "spoc-approval", label: "SPOC Approval", userActionRequired: false },
    { id: "slotting", label: "Slotting", userActionRequired: false },
    { id: "site-visit", label: "Site Visit & Issue Resolution", userActionRequired: false },
    { id: "activated", label: "Water Activated", userActionRequired: false },
  ],
};

export function getWorkflowStages(type: WorkflowType): WorkflowStage[] {
  return WORKFLOWS[type];
}

export function getCurrentStage(type: WorkflowType, stageIndex: number): WorkflowStage {
  const stages = WORKFLOWS[type];
  return stages[Math.min(stageIndex, stages.length - 1)];
}

export function getTimelineLabels(type: WorkflowType): string[] {
  return WORKFLOWS[type].map((s) => s.label);
}

export function getWorkflowLabel(type: WorkflowType): string {
  const labels: Record<WorkflowType, string> = {
    "power-regular": "Power – Postpaid Meter",
    "power-prepaid": "Power – Prepaid / Non-Metered",
    "power-temporary": "Power – Temporary",
    water: "Water – Existing Meter",
    "water-existing-meter": "Water – Existing Meter",
    "water-no-meter": "Water – New Meter Path",
  };
  return labels[type];
}

/** All possible connection type options for SPOC editing */
export const CONNECTION_TYPE_OPTIONS: { value: WorkflowType; label: string; utility: string }[] = [
  { value: "power-regular", label: "Power – Postpaid", utility: "Power" },
  { value: "power-prepaid", label: "Power – Prepaid / Non-Metered", utility: "Power" },
  { value: "power-temporary", label: "Power – Temporary", utility: "Power" },
  { value: "water-existing-meter", label: "Water – Existing Meter", utility: "Water" },
  { value: "water-no-meter", label: "Water – New Meter", utility: "Water" },
];
