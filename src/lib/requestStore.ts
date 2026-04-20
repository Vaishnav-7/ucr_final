import { useState, useCallback, useEffect } from "react";
import { getWorkflowStages } from "./workflows";
import type { WorkflowType } from "./workflows";

export interface RequestUserDetails {
  customerName?: string;
  customerCode?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
}

export type SdDecision = "collected" | "pending" | "waived";

export interface LoadAppliance {
  name: string;
  kw: number;
  qty: number;
}

export interface LoadData {
  method: "calculator" | "upload";
  totalKW: number;
  /** Maximum demand in kVAH (kW × hours / power factor). Primary metric. */
  totalKVAH: number;
  /** @deprecated kept for legacy seed data; use totalKVAH. */
  totalKVA?: number;
  appliances?: LoadAppliance[];
  docUploaded?: boolean;
}

export interface WaterDemandData {
  domesticKL: number;
  flushingKL: number;
  roKL: number;
  totalKL: number;
}

export interface ExtensionRequest {
  status: "pending" | "approved" | "rejected";
  newEndDate?: string;
  reason?: string;
  poUploaded?: boolean;
  poFileName?: string;
  rejectionReason?: string;
}

export interface ConnectionRequest {
  id: string;
  utility: string;
  type: string;
  workflowType: WorkflowType;
  address: string;
  addressId: string;
  spaceId?: string;
  stageIndex: number;
  date: string;
  expiry?: string;
  rejectionReason?: string;
  submittedDocs?: string[];
  siteVisitDate?: string;
  userDetails?: RequestUserDetails;
  sdDecision?: SdDecision;
  sdWaiverProof?: string;
  sdAmount?: string;
  completedActions?: string[];
  loadData?: LoadData;
  waterDemand?: WaterDemandData;
  deactivated?: boolean;
  extensionRequest?: ExtensionRequest;
}

export const INITIAL_REQUESTS: ConnectionRequest[] = [
  // ── Completed requests (various types) ──
  {
    id: "REQ-2024-101", utility: "Power", type: "Postpaid", workflowType: "power-regular",
    address: "Tower A, Block 4, Cyber City", addressId: "ADDR-S001", stageIndex: 9, date: "2023-11-10",
    siteVisitDate: "15 January 2024",
    userDetails: { customerName: "Acme Corp", customerCode: "CC-1001", contactPerson: "Rahul Sharma", mobile: "9876543210", email: "rahul@acme.com" },
    sdDecision: "collected", loadData: { method: "calculator", totalKW: 45, totalKVAH: 360, appliances: [] },
  },
  {
    id: "REQ-2024-102", utility: "Power", type: "Temporary", workflowType: "power-temporary",
    address: "Plot 7, Industrial Area Phase-II", addressId: "ADDR-S003", stageIndex: 8, date: "2023-12-01", expiry: "2024-06-01",
    siteVisitDate: "20 February 2024",
    userDetails: { customerName: "BuildRight Infra", customerCode: "CC-2045", contactPerson: "Priya Nair", mobile: "9123456780", email: "priya@buildright.in" },
    sdDecision: "pending", sdAmount: "25000", loadData: { method: "upload", totalKW: 120, totalKVAH: 1200, docUploaded: true },
  },
  {
    id: "REQ-2024-103", utility: "Power", type: "Prepaid", workflowType: "power-prepaid",
    address: "Shop 3, Market Complex", addressId: "ADDR-S005", stageIndex: 3, date: "2024-01-08",
    siteVisitDate: "28 January 2024",
    userDetails: { customerName: "QuickMart Retail", customerCode: "CC-3090", contactPerson: "Anil Gupta", mobile: "9988776655", email: "anil@quickmart.com" },
  },
  {
    id: "REQ-2024-104", utility: "Water", type: "Existing Meter", workflowType: "water-existing-meter",
    address: "Unit 12, Trade Centre, Sector 5", addressId: "ADDR-S002", stageIndex: 3, date: "2024-01-20",
    siteVisitDate: "10 February 2024",
    userDetails: { customerName: "HydroTech Solutions", customerCode: "CC-4012", contactPerson: "Meera Patel", mobile: "9871234567", email: "meera@hydrotech.co" },
    waterDemand: { domesticKL: 15, flushingKL: 5, roKL: 3, totalKL: 23 },
  },
  {
    id: "REQ-2024-105", utility: "Water", type: "New Meter", workflowType: "water-no-meter",
    address: "Warehouse 5, Sector 18", addressId: "ADDR-S004", stageIndex: 6, date: "2024-02-05",
    siteVisitDate: "05 March 2024",
    userDetails: { customerName: "FreshWater Industries", customerCode: "CC-5033", contactPerson: "Suresh Kumar", mobile: "9009988776", email: "suresh@freshwater.in" },
    waterDemand: { domesticKL: 25, flushingKL: 10, roKL: 8, totalKL: 43 },
  },

  // ── Active / in-progress requests ──
  { id: "REQ-2024-001", utility: "Power", type: "Postpaid", workflowType: "power-regular", address: "Tower A, Block 4, Cyber City", addressId: "ADDR-S001", stageIndex: 8, date: "2024-01-15" },
  { id: "REQ-2024-002", utility: "Water", type: "Existing Meter", workflowType: "water-existing-meter", address: "Unit 12, Trade Centre", addressId: "ADDR-S002", stageIndex: 3, date: "2024-02-20" },
  { id: "REQ-2024-003", utility: "Power", type: "Temporary", workflowType: "power-temporary", address: "Plot 7, Industrial Area", addressId: "ADDR-S003", stageIndex: 2, date: "2024-03-01", expiry: "2024-06-01" },
  { id: "REQ-2024-004", utility: "Power", type: "Postpaid", workflowType: "power-regular", address: "Tower A, Block 4, Cyber City", addressId: "ADDR-S001", stageIndex: 5, date: "2024-03-10" },
  { id: "REQ-2024-005", utility: "Power", type: "Temporary", workflowType: "power-temporary", address: "Warehouse 5, Sector 18", addressId: "ADDR-S004", stageIndex: 7, date: "2024-01-05", expiry: "2024-04-05" },
  { id: "REQ-2024-006", utility: "Water", type: "New Meter", workflowType: "water-no-meter", address: "Warehouse 5, Sector 18", addressId: "ADDR-S004", stageIndex: 2, date: "2024-03-15" },
  { id: "REQ-2024-007", utility: "Power", type: "Prepaid", workflowType: "power-prepaid", address: "Shop 3, Market Complex", addressId: "ADDR-S005", stageIndex: 1, date: "2024-03-18" },
  { id: "REQ-2024-008", utility: "Power", type: "Prepaid", workflowType: "power-prepaid", address: "Shop 3, Market Complex", addressId: "ADDR-S005", stageIndex: 3, date: "2024-03-12" },
];

let globalRequests: ConnectionRequest[] = [...INITIAL_REQUESTS];
let listeners: Array<() => void> = [];
let nextId = 109;

function notify() {
  listeners.forEach((l) => l());
}

function getInitialStageIndex(workflowType: WorkflowType) {
  const stages = getWorkflowStages(workflowType);
  if (workflowType === "power-regular") {
    const spocApprovalIndex = stages.findIndex((s) => s.id === "spoc-approval");
    return spocApprovalIndex >= 0 ? spocApprovalIndex : Math.min(1, stages.length - 1);
  }
  return Math.min(1, stages.length - 1);
}

export function addRequest(req: Omit<ConnectionRequest, "id" | "stageIndex" | "date"> & { userDetails?: RequestUserDetails }) {
  const id = `REQ-2024-${String(nextId++).padStart(3, "0")}`;
  globalRequests = [
    {
      ...req,
      id,
      stageIndex: getInitialStageIndex(req.workflowType),
      date: new Date().toISOString().split("T")[0],
    },
    ...globalRequests,
  ];
  notify();
  return id;
}

/** Update the mobile in userDetails for all matching requests (used when SPOC edits a customer's mobile) */
export function rekeyRequestMobile(oldMobile: string, newMobile: string) {
  const norm = (s: string) => s.replace(/\D/g, "").slice(-10);
  const oldNorm = norm(oldMobile);
  const newNorm = norm(newMobile);
  if (!oldNorm || !newNorm || oldNorm === newNorm) return;
  globalRequests = globalRequests.map((r) =>
    r.userDetails && norm(r.userDetails.mobile || "") === oldNorm
      ? { ...r, userDetails: { ...r.userDetails, mobile: newNorm } }
      : r,
  );
  notify();
}

export function useRequestStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.push(rerender);
    return () => {
      listeners = listeners.filter((l) => l !== rerender);
    };
  }, []);

  const advanceStage = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      const stages = getWorkflowStages(r.workflowType);
      return { ...r, stageIndex: Math.min(r.stageIndex + 1, stages.length - 1), rejectionReason: undefined, completedActions: [] };
    });
    notify();
  }, []);

  const markActionCompleted = useCallback((requestId: string, completedActions: string[]) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId ? { ...r, completedActions } : r
    );
    notify();
  }, []);

  const rejectRequest = useCallback((requestId: string, reason: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      return { ...r, stageIndex: Math.max(r.stageIndex - 1, 0), rejectionReason: reason };
    });
    notify();
  }, []);

  const clearRejection = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId ? { ...r, rejectionReason: undefined } : r
    );
    notify();
  }, []);

  const scheduleSiteVisit = useCallback((requestId: string, date: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      const stages = getWorkflowStages(r.workflowType);
      return { ...r, siteVisitDate: date, stageIndex: Math.min(r.stageIndex + 1, stages.length - 1) };
    });
    notify();
  }, []);

  const setSdDecision = useCallback((requestId: string, decision: SdDecision, waiverProof?: string, sdAmount?: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;

      const stages = getWorkflowStages(r.workflowType);
      const findStageIndex = (stageId: string) => stages.findIndex((stage) => stage.id === stageId);

      const updated: ConnectionRequest = {
        ...r,
        sdDecision: decision,
        sdWaiverProof: decision === "waived" ? waiverProof : undefined,
        sdAmount: decision === "pending" ? sdAmount : undefined,
        rejectionReason: undefined,
      };

      if (decision === "pending") {
        const sdPaymentIndex = findStageIndex("sd-payment");
        updated.stageIndex = sdPaymentIndex >= 0 ? sdPaymentIndex : Math.min(r.stageIndex + 1, stages.length - 1);
        return updated;
      }

      // Skip SD payment & finance confirms — go directly to meter step
      const customerMeterIndex = findStageIndex("customer-meter-upload");
      const meterRecIndex = findStageIndex("meter-recommendation");
      const targetIndex = customerMeterIndex >= 0 ? customerMeterIndex : meterRecIndex >= 0 ? meterRecIndex : Math.min(r.stageIndex + 1, stages.length - 1);
      updated.stageIndex = targetIndex;

      return updated;
    });
    notify();
  }, []);

  /** SPOC can change the connection type / workflow of a request */
  const updateConnectionType = useCallback((requestId: string, newWorkflowType: WorkflowType, newType: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      return {
        ...r,
        workflowType: newWorkflowType,
        type: newType,
        // Reset to SPOC approval stage of new workflow
        stageIndex: Math.min(1, getWorkflowStages(newWorkflowType).length - 1),
        completedActions: [],
        rejectionReason: undefined,
      };
    });
    notify();
  }, []);

  const requestExtension = useCallback((requestId: string, newEndDate: string, reason: string, poFileName?: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId
        ? { ...r, extensionRequest: { status: "pending" as const, newEndDate, reason, poUploaded: !!poFileName, poFileName } }
        : r
    );
    notify();
  }, []);

  const approveExtension = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId || !r.extensionRequest) return r;
      return { ...r, expiry: r.extensionRequest.newEndDate, extensionRequest: { ...r.extensionRequest, status: "approved" as const } };
    });
    notify();
  }, []);

  const rejectExtension = useCallback((requestId: string, reason: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId && r.extensionRequest
        ? { ...r, extensionRequest: { ...r.extensionRequest, status: "rejected" as const, rejectionReason: reason } }
        : r
    );
    notify();
  }, []);

  const deactivateConnection = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId ? { ...r, deactivated: true } : r
    );
    notify();
  }, []);

  /** SPOC can edit the connection address and Space ID after submission */
  const updateRequestAddress = useCallback((requestId: string, address: string, spaceId?: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId
        ? { ...r, address: address.trim(), spaceId: spaceId?.trim() ? spaceId.trim() : undefined }
        : r
    );
    notify();
  }, []);

  return {
    requests: globalRequests,
    advanceStage,
    markActionCompleted,
    rejectRequest,
    clearRejection,
    scheduleSiteVisit,
    setSdDecision,
    updateConnectionType,
    requestExtension,
    approveExtension,
    rejectExtension,
    deactivateConnection,
    updateRequestAddress,
  };
}
