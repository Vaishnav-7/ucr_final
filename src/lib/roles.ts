export type UserRole = "user" | "finance" | "spoc" | "pne";

export interface RoleInfo {
  id: UserRole;
  label: string;
  description: string;
}

export const ROLES: RoleInfo[] = [
  { id: "user", label: "User", description: "Submit and track connection requests" },
  { id: "finance", label: "Finance Team", description: "Verify payments and deposits" },
  { id: "spoc", label: "Department SPOC", description: "Approve security deposits and oversee workflow" },
  { id: "pne", label: "P&E Team", description: "Meter recommendations, slotting, and site visits" },
];

// Maps workflow stage IDs to the role responsible for acting on them
export const STAGE_ROLE_MAP: Record<string, UserRole> = {
  // Common
  "submitted": "spoc",
  "spoc-approval": "spoc",

  // Power Regular (postpaid)
  "sd-decision": "spoc",
  "sd-payment": "user",
  "finance-confirms": "finance",
  "finance-verification": "finance",
  "customer-meter-upload": "user",

  // Power Temporary
  "sd-calculation": "spoc",

  "meter-recommendation": "user",

  // Water no-meter
  "meter-purchase": "user",

  // Calibration uploaded (auto-advance by P&E)
  "calibration-uploaded": "pne",

  // Shared
  "slotting": "pne",
  "site-visit": "pne",
  "site-visit-form": "pne",
  "pne-final-approval": "pne",
  "activated": "pne",

  // Expiry
  "expiry-notification": "user",
};

// Which stages does a given internal role act upon (for filtering dashboard)
export function getStagesForRole(role: UserRole): string[] {
  return Object.entries(STAGE_ROLE_MAP)
    .filter(([, r]) => r === role)
    .map(([stageId]) => stageId);
}
