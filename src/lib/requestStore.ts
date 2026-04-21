import { useState, useCallback, useEffect } from "react";
import { getWorkflowStages } from "./workflows";
import type { WorkflowType } from "./workflows";
import type { PowerMeterRow } from "./meterRecommendationStore";

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
  /** Maximum demand in kVA — primary value shown to users. */
  totalKVA: number;
  /** Energy in kVAH (kVA × hours) — used only for SD calculation. */
  totalKVAH: number;
  /** @deprecated kept for legacy data; not displayed. */
  totalKW?: number;
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
  /** Customer-proposed preferred site visit date (slotting stage). */
  preferredSiteVisitDate?: string;
  userDetails?: RequestUserDetails;
  sdDecision?: SdDecision;
  sdWaiverProof?: string;
  sdAmount?: string;
  completedActions?: string[];
  loadData?: LoadData;
  waterDemand?: WaterDemandData;
  deactivated?: boolean;
  extensionRequest?: ExtensionRequest;
  /** ID of the workflow stage at which the request was rejected (cleared once it advances past that stage again). */
  rejectedFromStageId?: string;
  /** Meter chosen by the customer from the P&E recommendations (Power workflows). */
  selectedMeter?: PowerMeterRow;
  /** Combined SD+Meter parallel stage sub-state. Customer can submit either slice
   *  in any order; the stage advances only when both sliceApproved flags are true. */
  sdSubmitted?: boolean;
  sdApproved?: boolean;
  sdSliceRejectionReason?: string;
  meterSubmitted?: boolean;
  meterApproved?: boolean;
  meterSliceRejectionReason?: string;
  /** Site-visit operative assigned by P&E when scheduling the visit. The mobile
   *  acts as their login credential for the Site Visit dashboard. */
  siteVisitor?: { name: string; mobile: string };
}

export const INITIAL_REQUESTS: ConnectionRequest[] = [
  // ── Completed requests (various types) ──
  {
    id: "REQ-2024-101", utility: "Power", type: "Postpaid", workflowType: "power-regular",
    address: "Tower A, Block 4, Cyber City", addressId: "ADDR-S001", stageIndex: 9, date: "2023-11-10",
    siteVisitDate: "15 January 2024",
    userDetails: { customerName: "Acme Corp", customerCode: "CC-1001", contactPerson: "Rahul Sharma", mobile: "9876543210", email: "rahul@acme.com" },
    sdDecision: "collected", loadData: { method: "calculator", totalKVA: 56.25, totalKVAH: 360, appliances: [] },
  },
  {
    id: "REQ-2024-102", utility: "Power", type: "Temporary", workflowType: "power-temporary",
    address: "Plot 7, Industrial Area Phase-II", addressId: "ADDR-S003", stageIndex: 8, date: "2023-12-01", expiry: "2024-06-01",
    siteVisitDate: "20 February 2024",
    userDetails: { customerName: "BuildRight Infra", customerCode: "CC-2045", contactPerson: "Priya Nair", mobile: "9123456780", email: "priya@buildright.in" },
    sdDecision: "pending", sdAmount: "25000", loadData: { method: "upload", totalKVA: 150, totalKVAH: 1200, docUploaded: true },
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

  // ── Site Visit assignments (stage = site-visit-form) — fully detailed for site-visit role ──
  {
    id: "REQ-2024-201", utility: "Power", type: "Postpaid", workflowType: "power-regular",
    address: "Tower B, Floor 12, Cyber City, Sector 24", addressId: "ADDR-S010", spaceId: "SPC-1042",
    stageIndex: 5, date: "2024-03-22", siteVisitDate: "12 April 2024",
    userDetails: { customerName: "Nimbus Analytics Pvt Ltd", customerCode: "CC-7012", contactPerson: "Vikram Joshi", mobile: "9811223344", email: "vikram@nimbus.io" },
    loadData: {
      method: "calculator", totalKVA: 75.5, totalKVAH: 540,
      appliances: [
        { name: "Split AC 2 Ton", kw: 2.2, qty: 12 },
        { name: "Workstation PCs", kw: 0.4, qty: 60 },
        { name: "LED Panel Lights", kw: 0.04, qty: 120 },
        { name: "Server Rack", kw: 5, qty: 2 },
        { name: "Pantry Equipment", kw: 6, qty: 1 },
      ],
    },
    selectedMeter: { make: "Secure", model: "Elite 444", conn: "3-Phase 4-Wire", ct: "Yes", remark: "CT 100/5A required" },
    sdDecision: "collected",
  },
  {
    id: "REQ-2024-202", utility: "Power", type: "Temporary", workflowType: "power-temporary",
    address: "Construction Site, Plot 22, Industrial Phase-III", addressId: "ADDR-S011", spaceId: "SPC-2210",
    stageIndex: 4, date: "2024-03-25", expiry: "2024-09-25", siteVisitDate: "15 April 2024",
    userDetails: { customerName: "Skyline Constructions", customerCode: "CC-8045", contactPerson: "Deepak Mehra", mobile: "9822334455", email: "deepak@skylinecons.in" },
    loadData: { method: "upload", totalKVA: 200, totalKVAH: 1600, docUploaded: true },
    selectedMeter: { make: "L&T", model: "ER300P", conn: "3-Phase 4-Wire", ct: "Yes", remark: "Outdoor enclosure" },
    sdDecision: "collected",
  },
  {
    id: "REQ-2024-204", utility: "Water", type: "Existing Meter", workflowType: "water-existing-meter",
    address: "Office Tower 3, Wing B, Trade Centre, Sector 5", addressId: "ADDR-S013", spaceId: "SPC-4412",
    stageIndex: 3, date: "2024-04-01", siteVisitDate: "18 April 2024",
    userDetails: { customerName: "Aquaflow Services", customerCode: "CC-1108", contactPerson: "Sanjay Verma", mobile: "9844556677", email: "sanjay@aquaflow.co" },
    waterDemand: { domesticKL: 18, flushingKL: 6, roKL: 4, totalKL: 28 },
  },
  {
    id: "REQ-2024-205", utility: "Water", type: "New Meter", workflowType: "water-no-meter",
    address: "Warehouse 11, Logistics Park, Sector 22", addressId: "ADDR-S014", spaceId: "SPC-5523",
    stageIndex: 5, date: "2024-04-03", siteVisitDate: "20 April 2024",
    userDetails: { customerName: "GreenLeaf Foods Pvt Ltd", customerCode: "CC-1209", contactPerson: "Pooja Iyer", mobile: "9855667788", email: "pooja@greenleaf.in" },
    waterDemand: { domesticKL: 30, flushingKL: 12, roKL: 10, totalKL: 52 },
  },
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
      const currentStage = stages[Math.min(r.stageIndex, stages.length - 1)];
      // For the combined parallel SD+Meter stage, only advance when BOTH slices are approved.
      if (currentStage?.id === "sd-and-meter") {
        const sdDone = r.sdDecision !== "pending" || r.sdApproved;
        const meterDone = !!r.meterApproved;
        if (!(sdDone && meterDone)) return r;
      }
      const newIndex = Math.min(r.stageIndex + 1, stages.length - 1);
      // Clear the red rejected-stage marker once we successfully pass that stage again.
      const rejectedIdx = r.rejectedFromStageId ? stages.findIndex((s) => s.id === r.rejectedFromStageId) : -1;
      const clearRejectedFrom = rejectedIdx >= 0 && newIndex > rejectedIdx;
      return {
        ...r,
        stageIndex: newIndex,
        rejectionReason: undefined,
        completedActions: [],
        rejectedFromStageId: clearRejectedFrom ? undefined : r.rejectedFromStageId,
      };
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
      const stages = getWorkflowStages(r.workflowType);
      const rejectedStageId = stages[Math.min(r.stageIndex, stages.length - 1)]?.id;
      return {
        ...r,
        stageIndex: Math.max(r.stageIndex - 1, 0),
        rejectionReason: reason,
        rejectedFromStageId: rejectedStageId,
      };
    });
    notify();
  }, []);

  const clearRejection = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId ? { ...r, rejectionReason: undefined } : r
    );
    notify();
  }, []);

  const scheduleSiteVisit = useCallback((requestId: string, date: string, siteVisitor?: { name: string; mobile: string }) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      const stages = getWorkflowStages(r.workflowType);
      const sv = siteVisitor && siteVisitor.name.trim() && siteVisitor.mobile.trim()
        ? { name: siteVisitor.name.trim(), mobile: siteVisitor.mobile.replace(/\D/g, "").slice(-10) }
        : r.siteVisitor;
      return { ...r, siteVisitDate: date, siteVisitor: sv, stageIndex: Math.min(r.stageIndex + 1, stages.length - 1) };
    });
    notify();
  }, []);

  /** Customer submits (or updates) their preferred site visit date.
   *  Stays at slotting stage — P&E still needs to accept/edit. */
  const submitPreferredSiteVisitDate = useCallback((requestId: string, date: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId ? { ...r, preferredSiteVisitDate: date } : r,
    );
    notify();
  }, []);

  /** P&E updates the confirmed site visit date AFTER it was already scheduled
   *  (allowed up until the site-visit-form is submitted). Does not change stage. */
  const updateConfirmedSiteVisitDate = useCallback((requestId: string, date: string, siteVisitor?: { name: string; mobile: string }) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      const sv = siteVisitor && siteVisitor.name.trim() && siteVisitor.mobile.trim()
        ? { name: siteVisitor.name.trim(), mobile: siteVisitor.mobile.replace(/\D/g, "").slice(-10) }
        : r.siteVisitor;
      return { ...r, siteVisitDate: date, siteVisitor: sv };
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

      // Combined parallel SD + Meter stage. Customer always lands here regardless of SD decision;
      // when SD is waived/collected, the SD slice is auto-approved so only the meter slice remains.
      const combinedIndex = findStageIndex("sd-and-meter");
      const targetIndex =
        combinedIndex >= 0
          ? combinedIndex
          : Math.min(r.stageIndex + 1, stages.length - 1);
      updated.stageIndex = targetIndex;

      if (decision === "pending") {
        // Customer must still upload SD proof; reset SD slice flags.
        updated.sdSubmitted = false;
        updated.sdApproved = false;
        updated.sdSliceRejectionReason = undefined;
      } else {
        // Waived or collected → SD slice considered done immediately.
        updated.sdSubmitted = true;
        updated.sdApproved = true;
        updated.sdSliceRejectionReason = undefined;
      }

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

  /** SPOC can edit the load (Max Demand in kVA + kVAH for SD) on a submitted request */
  const updateLoad = useCallback((requestId: string, totalKVA: number, totalKVAH: number) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      const existing: LoadData = r.loadData ?? { method: "upload", totalKVA: 0, totalKVAH: 0 };
      return { ...r, loadData: { ...existing, totalKVA, totalKVAH } };
    });
    notify();
  }, []);

  const selectPowerMeter = useCallback((requestId: string, meter: PowerMeterRow) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId ? { ...r, selectedMeter: meter } : r
    );
    notify();
  }, []);

  /** Customer submits SD payment proof on the combined parallel stage → routes to Finance. */
  const submitSdSlice = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId
        ? { ...r, sdSubmitted: true, sdApproved: false, sdSliceRejectionReason: undefined }
        : r,
    );
    notify();
  }, []);

  /** Customer submits meter calibration cert on the combined parallel stage → routes to P&E. */
  const submitMeterSlice = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId
        ? { ...r, meterSubmitted: true, meterApproved: false, meterSliceRejectionReason: undefined }
        : r,
    );
    notify();
  }, []);

  /** Finance approves the SD slice. If meter slice is also approved, advance to next stage. */
  const approveSdSlice = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      const updated = { ...r, sdApproved: true, sdSliceRejectionReason: undefined };
      const stages = getWorkflowStages(r.workflowType);
      if (updated.meterApproved) {
        return { ...updated, stageIndex: Math.min(updated.stageIndex + 1, stages.length - 1), completedActions: [] };
      }
      return updated;
    });
    notify();
  }, []);

  /** P&E approves the meter slice. If SD slice is also approved, advance to next stage. */
  const approveMeterSlice = useCallback((requestId: string) => {
    globalRequests = globalRequests.map((r) => {
      if (r.id !== requestId) return r;
      const updated = { ...r, meterApproved: true, meterSliceRejectionReason: undefined };
      const stages = getWorkflowStages(r.workflowType);
      const sdDone = updated.sdDecision !== "pending" || updated.sdApproved;
      if (sdDone) {
        return { ...updated, stageIndex: Math.min(updated.stageIndex + 1, stages.length - 1), completedActions: [] };
      }
      return updated;
    });
    notify();
  }, []);

  const rejectSdSlice = useCallback((requestId: string, reason: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId
        ? { ...r, sdSubmitted: false, sdApproved: false, sdSliceRejectionReason: reason }
        : r,
    );
    notify();
  }, []);

  const rejectMeterSlice = useCallback((requestId: string, reason: string) => {
    globalRequests = globalRequests.map((r) =>
      r.id === requestId
        ? { ...r, meterSubmitted: false, meterApproved: false, meterSliceRejectionReason: reason }
        : r,
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
    submitPreferredSiteVisitDate,
    updateConfirmedSiteVisitDate,
    setSdDecision,
    updateConnectionType,
    requestExtension,
    approveExtension,
    rejectExtension,
    deactivateConnection,
    updateRequestAddress,
    updateLoad,
    selectPowerMeter,
    submitSdSlice,
    submitMeterSlice,
    approveSdSlice,
    approveMeterSlice,
    rejectSdSlice,
    rejectMeterSlice,
  };
}
