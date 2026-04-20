// Customer Code request store – tracks verification & creation requests
// that require Finance approval before the user can proceed.

import { useState, useEffect, useCallback } from "react";

export type CcRequestType = "verify" | "create";
export type CcRequestStatus = "pending" | "approved" | "rejected";

export interface CcRequest {
  id: string;
  type: CcRequestType;
  mobile: string; // links request to user
  status: CcRequestStatus;
  createdAt: string;
  rejectionReason?: string;

  // Basic user details (always available)
  companyName?: string;
  contactPerson?: string;
  email?: string;

  // For "verify" requests
  existingCode?: string;

  // For "create" requests – full form data
  customerForm?: Record<string, string>;
  uploadedDocs?: Record<string, boolean>;

  // Assigned by finance on approval
  approvedCode?: string;
  approvedAt?: string;
}

const INITIAL_CC_REQUESTS: CcRequest[] = [
  {
    id: "CC-0001", type: "verify", mobile: "9876543210", status: "approved", createdAt: "2024-01-12",
    companyName: "Acme Corp", contactPerson: "Rahul Sharma", email: "rahul@acme.com",
    existingCode: "CC-1001", approvedCode: "CC-1001", approvedAt: "2024-01-13",
  },
  {
    id: "CC-0002", type: "create", mobile: "9123456780", status: "approved", createdAt: "2024-01-18",
    companyName: "BuildRight Infra", contactPerson: "Priya Nair", email: "priya@buildright.in",
    customerForm: { gstNumber: "27AABCB1234F1ZP", panNumber: "AABCB1234F", registeredAddress: "Plot 7, Industrial Area Phase-II" },
    approvedCode: "CC-2045", approvedAt: "2024-01-20",
  },
  {
    id: "CC-0003", type: "create", mobile: "9988776655", status: "rejected", createdAt: "2024-02-01",
    companyName: "NovaTech Pvt Ltd", contactPerson: "Vikram Singh", email: "vikram@novatech.in",
    customerForm: { gstNumber: "29AADCN5678G1Z5", panNumber: "AADCN5678G" },
    rejectionReason: "Incomplete GST documentation — please resubmit with valid certificate.",
  },
  {
    id: "CC-0004", type: "verify", mobile: "9871234567", status: "approved", createdAt: "2024-02-10",
    companyName: "HydroTech Solutions", contactPerson: "Meera Patel", email: "meera@hydrotech.co",
    existingCode: "CC-4012", approvedCode: "CC-4012", approvedAt: "2024-02-11",
  },
  {
    id: "CC-0005", type: "create", mobile: "9009988776", status: "pending", createdAt: "2024-03-05",
    companyName: "FreshWater Industries", contactPerson: "Suresh Kumar", email: "suresh@freshwater.in",
    customerForm: { gstNumber: "36AABCF9876H1Z3", panNumber: "AABCF9876H", registeredAddress: "Warehouse 5, Sector 18" },
  },
  {
    id: "CC-0006", type: "verify", mobile: "9556677889", status: "rejected", createdAt: "2024-03-08",
    companyName: "SkyLine Constructions", contactPerson: "Amit Joshi", email: "amit@skyline.co",
    existingCode: "CC-9999", rejectionReason: "Customer code CC-9999 does not exist in our records.",
  },
];

let globalCcRequests: CcRequest[] = [...INITIAL_CC_REQUESTS];
let listeners: Array<() => void> = [];
let nextId = 7;

function notify() {
  listeners.forEach((l) => l());
}

function normMobile(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

/** Submit a new CC request (user side) */
export function submitCcRequest(
  req: Pick<CcRequest, "type" | "mobile" | "existingCode" | "customerForm" | "uploadedDocs" | "companyName" | "contactPerson" | "email">
): string {
  const id = `CC-${String(nextId++).padStart(4, "0")}`;
  globalCcRequests = [
    {
      id,
      type: req.type,
      mobile: normMobile(req.mobile),
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
      companyName: req.companyName,
      contactPerson: req.contactPerson,
      email: req.email,
      existingCode: req.existingCode,
      customerForm: req.customerForm,
      uploadedDocs: req.uploadedDocs,
    },
    ...globalCcRequests,
  ];
  notify();
  return id;
}

/** Finance approves a CC request, optionally assigning a code */
export function approveCcRequest(id: string, approvedCode?: string) {
  globalCcRequests = globalCcRequests.map((r) =>
    r.id === id ? { ...r, status: "approved" as CcRequestStatus, approvedCode: approvedCode || r.existingCode, approvedAt: new Date().toISOString().split("T")[0] } : r
  );
  notify();
}

/** Finance rejects a CC request */
export function rejectCcRequest(id: string, reason: string) {
  globalCcRequests = globalCcRequests.map((r) =>
    r.id === id ? { ...r, status: "rejected" as CcRequestStatus, rejectionReason: reason } : r
  );
  notify();
}

/** Get the latest CC request for a mobile number */
export function getCcRequestByMobile(mobile: string): CcRequest | undefined {
  const norm = normMobile(mobile);
  return globalCcRequests.find((r) => r.mobile === norm);
}

/** Update the mobile attached to all CC requests of a user */
export function rekeyCcRequestMobile(oldMobile: string, newMobile: string) {
  const oldNorm = normMobile(oldMobile);
  const newNorm = normMobile(newMobile);
  if (!oldNorm || !newNorm || oldNorm === newNorm) return;
  globalCcRequests = globalCcRequests.map((r) => (r.mobile === oldNorm ? { ...r, mobile: newNorm } : r));
  notify();
}

/** Get all pending CC requests (for finance dashboard) */
export function getPendingCcRequests(): CcRequest[] {
  return globalCcRequests.filter((r) => r.status === "pending");
}

/** Get all CC requests */
export function getAllCcRequests(): CcRequest[] {
  return globalCcRequests;
}

/** React hook to subscribe to CC request changes */
export function useCcRequestStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.push(rerender);
    return () => {
      listeners = listeners.filter((l) => l !== rerender);
    };
  }, []);

  return {
    allRequests: globalCcRequests,
    pendingRequests: globalCcRequests.filter((r) => r.status === "pending"),
    approve: useCallback((id: string, code?: string) => approveCcRequest(id, code), []),
    reject: useCallback((id: string, reason: string) => rejectCcRequest(id, reason), []),
    getByMobile: useCallback((mobile: string) => getCcRequestByMobile(mobile), []),
  };
}
