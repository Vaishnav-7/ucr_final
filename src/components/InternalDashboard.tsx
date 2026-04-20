import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Droplets, CheckCircle2, Clock, AlertCircle, BarChart3,
  LogOut, FileText, XCircle, ChevronDown, ChevronUp, CalendarIcon,
  Upload, ShieldCheck, Hash, Search, Plus, Pencil, Settings, Save, Layers, User, Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { useCcRequestStore, type CcRequest, rekeyCcRequestMobile } from "@/lib/ccRequestStore";
import { getRegisteredUser, rekeyRegisteredUser } from "@/lib/userRegistry";
import { format } from "date-fns";
import type { UserRole } from "@/lib/roles";
import { STAGE_ROLE_MAP } from "@/lib/roles";
import { useRequestStore, type ConnectionRequest, type SdDecision, rekeyRequestMobile } from "@/lib/requestStore";
import { getWorkflowStages, getCurrentStage, getTimelineLabels, getWorkflowLabel, CONNECTION_TYPE_OPTIONS, getWaterMeterUploadActions, getWaterSiteVisitActions } from "@/lib/workflows";
import type { WorkflowType } from "@/lib/workflows";
import { saveDocument, useDocumentStore } from "@/lib/documentStore";
import DocumentLink from "./DocumentLink";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import WorkflowActionModal, { type WorkflowAction } from "./WorkflowActionModal";
import { getPowerMeterRows, setPowerMeterRows, getPowerFooterNote, setPowerFooterNote, getWaterRecommendation, setWaterRecommendation, subscribeMeterRecommendation, type PowerMeterRow } from "@/lib/meterRecommendationStore";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "./ui/table";
import { useEffect } from "react";
import { SPOC_DEPARTMENT_MAP } from "./LoginStep";
import { useCustomerStore, type Customer, type Department } from "@/lib/customerStore";

interface InternalDashboardProps {
  role: UserRole;
  roleLabel: string;
  userMobile?: string;
  onLogout: () => void;
}

type DashFilter = "pending" | "all" | "completed";

const InternalDashboard = ({ role, roleLabel, userMobile, onLogout }: InternalDashboardProps) => {
  const { requests, advanceStage, rejectRequest, scheduleSiteVisit, setSdDecision, updateConnectionType, approveExtension, rejectExtension, updateRequestAddress } = useRequestStore();
  const ccStore = useCcRequestStore();
  const customerStore = useCustomerStore();
  const { getDocumentsForRequest } = useDocumentStore();
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dashFilter, setDashFilter] = useState<DashFilter>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [siteVisitReqId, setSiteVisitReqId] = useState<string | null>(null);
  const [siteVisitDate, setSiteVisitDate] = useState<Date | undefined>(undefined);
  const [sdModalReqId, setSdModalReqId] = useState<string | null>(null);
  const [sdChoice, setSdChoice] = useState<SdDecision | null>(null);
  const [sdWaiverFile, setSdWaiverFile] = useState<string>("");
  const [sdWaiverFileObj, setSdWaiverFileObj] = useState<File | null>(null);
  const [sdAmountValue, setSdAmountValue] = useState<string>("");
  const [actionModalReqId, setActionModalReqId] = useState<string | null>(null);
  const [actionModalAction, setActionModalAction] = useState<WorkflowAction | null>(null);

  // SPOC connection type editing
  const [editTypeReqId, setEditTypeReqId] = useState<string | null>(null);
  const [editTypeValue, setEditTypeValue] = useState<WorkflowType | "">("");
  const [editTypeTempDates, setEditTypeTempDates] = useState({ from: "", to: "" });
  // Hierarchical power edit state
  const [editPowerCategory, setEditPowerCategory] = useState<"regular" | "temporary" | null>(null);
  const [editMeterType, setEditMeterType] = useState<"metered" | "non-metered" | null>(null);
  const [editBillingType, setEditBillingType] = useState<"postpaid" | "prepaid" | null>(null);
  const [editWaterType, setEditWaterType] = useState<"existing" | "new" | null>(null);

  // SPOC address/spaceId editing
  const [editAddrReqId, setEditAddrReqId] = useState<string | null>(null);
  const [editAddrValue, setEditAddrValue] = useState("");
  const [editSpaceIdValue, setEditSpaceIdValue] = useState("");

  // CC approval state (finance only)
  const [ccExpandedId, setCcExpandedId] = useState<string | null>(null);
  const [ccApproveCode, setCcApproveCode] = useState<Record<string, string>>({});
  const [ccRejectId, setCcRejectId] = useState<string | null>(null);
  const [ccRejectReason, setCcRejectReason] = useState("");

  // P&E meter recommendation editor
  const [showMeterRecEditor, setShowMeterRecEditor] = useState(false);
  const [powerRowsDraft, setPowerRowsDraft] = useState<PowerMeterRow[]>(getPowerMeterRows());
  const [powerFooterDraft, setPowerFooterDraft] = useState(getPowerFooterNote());
  const [waterRecDraft, setWaterRecDraft] = useState(getWaterRecommendation());
  const [meterRecSaved, setMeterRecSaved] = useState(false);

  // SPOC extension approval
  const [extRejectId, setExtRejectId] = useState<string | null>(null);
  const [extRejectReason, setExtRejectReason] = useState("");
  const [showCcHistory, setShowCcHistory] = useState(false);
  const [ccHistorySearch, setCcHistorySearch] = useState("");

  // SPOC: my customers panel
  const [showMyCustomers, setShowMyCustomers] = useState(false);
  const [editingCustomerMobile, setEditingCustomerMobile] = useState<string | null>(null);
  const [customerDraft, setCustomerDraft] = useState<Partial<Customer>>({});
  const [customerEditError, setCustomerEditError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeMeterRecommendation(() => {
      setPowerRowsDraft(getPowerMeterRows());
      setPowerFooterDraft(getPowerFooterNote());
      setWaterRecDraft(getWaterRecommendation());
    });
  }, []);

  // SPOC department + their customers (by mobile)
  const spocDept: Department | null =
    role === "spoc" && userMobile ? (SPOC_DEPARTMENT_MAP[userMobile.replace(/\D/g, "").slice(-10)] ?? null) : null;
  const myCustomers = spocDept ? customerStore.byDepartment(spocDept) : [];
  const myCustomerMobiles = new Set(myCustomers.map((c) => c.mobile));

  // Restrict request visibility for SPOCs to their attached customers.
  const requestBelongsToMe = (r: ConnectionRequest) => {
    if (role !== "spoc" || !spocDept) return true;
    const mob = r.userDetails?.mobile?.replace(/\D/g, "").slice(-10);
    return mob ? myCustomerMobiles.has(mob) : false;
  };

  const visibleRequests = requests.filter(requestBelongsToMe);

  // All requests where current stage belongs to this role and not completed
  const myPendingRequests = visibleRequests.filter((r) => {
    const stage = getCurrentStage(r.workflowType, r.stageIndex);
    const stageRole = STAGE_ROLE_MAP[stage.id];
    const stages = getWorkflowStages(r.workflowType);
    const isCompleted = r.stageIndex >= stages.length - 1;
    return stageRole === role && !isCompleted;
  });

  const completedRequests = visibleRequests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    return r.stageIndex >= stages.length - 1;
  });

  const baseDisplayRequests =
    dashFilter === "pending" ? myPendingRequests :
    dashFilter === "completed" ? completedRequests :
    visibleRequests;

  const searchQ = searchQuery.trim().toLowerCase();
  const displayRequests = searchQ
    ? baseDisplayRequests.filter((r) => {
        const ud = r.userDetails;
        return [
          r.id, r.address, r.addressId, r.spaceId, r.utility, r.type,
          ud?.customerName, ud?.customerCode, ud?.contactPerson, ud?.mobile, ud?.email,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(searchQ));
      })
    : baseDisplayRequests;

  const handleApprove = (reqId: string) => {
    const req = requests.find((r) => r.id === reqId);
    if (!req) return;

    const stage = getCurrentStage(req.workflowType, req.stageIndex);

    // SPOC SD decision gate for power workflows
    const isSdGateStage = ["spoc-approval", "sd-decision", "sd-calculation"].includes(stage.id);
    const isSdWorkflow = req.workflowType === "power-regular" || req.workflowType === "power-temporary";

    if (role === "spoc" && isSdWorkflow && isSdGateStage) {
      setSdModalReqId(reqId);
      setSdChoice(req.sdDecision ?? null);
      setSdWaiverFile(req.sdWaiverProof ?? "");
      return;
    }

    // Site visit scheduling for P&E
    if ((role === "pne" || role === "spoc") && (stage.id === "site-visit" || stage.id === "slotting")) {
      setSiteVisitReqId(reqId);
      return;
    }

    // Site visit form for P&E — pre-populate load value or use dynamic water form
    if (stage.id === "site-visit-form" && stage.actions && stage.actions.length > 0) {
      let action: WorkflowAction;
      if (req.utility === "Water" && req.waterDemand) {
        action = getWaterSiteVisitActions(req.waterDemand);
      } else {
        action = JSON.parse(JSON.stringify(stage.actions[0]));
        if (req.loadData && action.fields) {
          const loadField = action.fields.find((f: any) => f.name === "details_of_load");
          if (loadField) {
            loadField.autoValue = `${req.loadData.totalKW.toFixed(2)} kW / ${req.loadData.totalKVA.toFixed(2)} kVA`;
          }
        }
      }
      setActionModalReqId(reqId);
      setActionModalAction(action);
      return;
    }

    advanceStage(reqId);
  };

  const handleSdSubmit = () => {
    if (sdModalReqId && sdChoice) {
      if (sdChoice === "waived" && sdWaiverFileObj) {
        saveDocument(sdModalReqId, "sd-waiver-proof", sdWaiverFileObj, "SD Waiver Proof");
      }
      setSdDecision(sdModalReqId, sdChoice, sdChoice === "waived" ? sdWaiverFile : undefined, sdChoice === "pending" ? sdAmountValue : undefined);
      setSdModalReqId(null);
      setSdChoice(null);
      setSdWaiverFile("");
      setSdWaiverFileObj(null);
      setSdAmountValue("");
    }
  };

  const handleScheduleSiteVisit = () => {
    if (siteVisitReqId && siteVisitDate) {
      scheduleSiteVisit(siteVisitReqId, format(siteVisitDate, "dd MMMM yyyy"));
      setSiteVisitReqId(null);
      setSiteVisitDate(undefined);
    }
  };

  const handleReject = () => {
    if (rejectModalId && rejectReason.trim()) {
      rejectRequest(rejectModalId, rejectReason.trim());
      setRejectModalId(null);
      setRejectReason("");
    }
  };

  const stats = [
    { label: "Pending Actions", value: String(myPendingRequests.length), icon: <Clock className="w-5 h-5" />, color: "text-warning", bg: "bg-warning/10", filter: "pending" as DashFilter },
    { label: "All Requests", value: String(visibleRequests.length), icon: <BarChart3 className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/10", filter: "all" as DashFilter },
    { label: "Completed", value: String(completedRequests.length), icon: <CheckCircle2 className="w-5 h-5" />, color: "text-success", bg: "bg-success/10", filter: "completed" as DashFilter },
  ];

  const spocDeptLabel = spocDept === "aero" ? "Aero" : spocDept === "non-aero" ? "Non-Aero" : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              Dashboard
              {spocDeptLabel && (
                <span className="ml-3 align-middle text-sm font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {spocDeptLabel}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {role === "spoc" && (
              <button
                onClick={() => setShowMyCustomers(!showMyCustomers)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <User className="w-4 h-4" /> My Customers
                <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {myCustomers.length}
                </span>
              </button>
            )}
            {role === "pne" && (
              <>
                <button
                  onClick={() => {
                    const rows = completedRequests.map((r) => ({
                      "Request Number": r.id,
                      "Customer Code": r.userDetails?.customerCode || "N/A",
                      "Customer Name": r.userDetails?.customerName || "N/A",
                      "Address": r.address,
                      "Connection Type": `${r.utility} - ${r.type}`,
                      "Connection Activation Date": r.siteVisitDate || r.date,
                    }));
                    const ws = XLSX.utils.json_to_sheet(rows);
                    ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 35 }, { wch: 25 }, { wch: 24 }];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Completed Requests");
                    XLSX.writeFile(wb, `Completed_Requests_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
                  }}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" /> Download Report
                </button>
                <button
                  onClick={() => { setShowMeterRecEditor(!showMeterRecEditor); setPowerRowsDraft(getPowerMeterRows()); setPowerFooterDraft(getPowerFooterNote()); setWaterRecDraft(getWaterRecommendation()); setMeterRecSaved(false); }}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Settings className="w-4 h-4" /> Meter Recommendation
                </button>
              </>
            )}
            {role === "finance" && (
              <button
                onClick={() => setShowCcHistory(!showCcHistory)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" /> CC History
              </button>
            )}
            <button onClick={onLogout} className="btn-secondary flex items-center gap-2 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {/* Stats as filter buttons */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.button
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setDashFilter(stat.filter)}
              className={`glass-card p-5 text-left transition-all ${dashFilter === stat.filter ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.button>
          ))}
        </div>

        {/* Global Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request ID, address, space ID, customer, mobile…"
            className="input-glass w-full pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <XCircle className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {role === "pne" && showMeterRecEditor && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6 space-y-6">
            <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Meter Recommendation Messages
            </h2>
            <p className="text-sm text-muted-foreground">
              Edit the messages shown to users when they need to purchase meters. These apply to all new requests.
            </p>

            {/* Power Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" /> Power Meter Recommendation
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-bold">Make of Energy Meter</TableHead>
                      <TableHead className="text-xs font-bold">Model Number</TableHead>
                      <TableHead className="text-xs font-bold">Connection Type</TableHead>
                      <TableHead className="text-xs font-bold">CT's Requirement</TableHead>
                      <TableHead className="text-xs font-bold">Remarks</TableHead>
                      <TableHead className="text-xs font-bold w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {powerRowsDraft.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell><input className="input-glass w-full text-xs" value={row.make} onChange={(e) => { const r = [...powerRowsDraft]; r[idx] = { ...r[idx], make: e.target.value }; setPowerRowsDraft(r); setMeterRecSaved(false); }} /></TableCell>
                        <TableCell><input className="input-glass w-full text-xs" value={row.model} onChange={(e) => { const r = [...powerRowsDraft]; r[idx] = { ...r[idx], model: e.target.value }; setPowerRowsDraft(r); setMeterRecSaved(false); }} /></TableCell>
                        <TableCell><input className="input-glass w-full text-xs" value={row.conn} onChange={(e) => { const r = [...powerRowsDraft]; r[idx] = { ...r[idx], conn: e.target.value }; setPowerRowsDraft(r); setMeterRecSaved(false); }} /></TableCell>
                        <TableCell><input className="input-glass w-full text-xs" value={row.ct} onChange={(e) => { const r = [...powerRowsDraft]; r[idx] = { ...r[idx], ct: e.target.value }; setPowerRowsDraft(r); setMeterRecSaved(false); }} /></TableCell>
                        <TableCell><input className="input-glass w-full text-xs" value={row.remark} onChange={(e) => { const r = [...powerRowsDraft]; r[idx] = { ...r[idx], remark: e.target.value }; setPowerRowsDraft(r); setMeterRecSaved(false); }} /></TableCell>
                        <TableCell>
                          <button onClick={() => { setPowerRowsDraft(powerRowsDraft.filter((_, i) => i !== idx)); setMeterRecSaved(false); }} className="text-destructive hover:text-destructive/80 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <button
                onClick={() => { setPowerRowsDraft([...powerRowsDraft, { make: "", model: "", conn: "", ct: "", remark: "" }]); setMeterRecSaved(false); }}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
              <textarea
                className="input-glass w-full min-h-[60px] resize-y font-mono text-xs"
                placeholder="Footer note shown below the table..."
                value={powerFooterDraft}
                onChange={(e) => { setPowerFooterDraft(e.target.value); setMeterRecSaved(false); }}
              />
            </div>

            {/* Water Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Droplets className="w-4 h-4 text-info" /> Water Meter Recommendation
              </h3>
              <textarea
                className="input-glass w-full min-h-[120px] resize-y font-mono text-sm"
                value={waterRecDraft}
                onChange={(e) => { setWaterRecDraft(e.target.value); setMeterRecSaved(false); }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPowerMeterRows(powerRowsDraft);
                  setPowerFooterNote(powerFooterDraft);
                  setWaterRecommendation(waterRecDraft);
                  setMeterRecSaved(true);
                  setTimeout(() => setMeterRecSaved(false), 2000);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Both
              </button>
              <button onClick={() => setShowMeterRecEditor(false)} className="btn-secondary">Close</button>
              {meterRecSaved && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-success flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Saved successfully
                </motion.span>
              )}
            </div>
          </motion.div>
        )}

        {/* SPOC: My Customers panel */}
        {role === "spoc" && showMyCustomers && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                My Customers
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({myCustomers.length} attached to {spocDeptLabel})
                </span>
              </h2>
              <button onClick={() => setShowMyCustomers(false)} className="btn-secondary text-sm">Close</button>
            </div>
            {myCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No customers attached to your department yet.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-bold">Customer Name</TableHead>
                      <TableHead className="text-xs font-bold">Customer Code</TableHead>
                      <TableHead className="text-xs font-bold">Contact</TableHead>
                      <TableHead className="text-xs font-bold">Mobile</TableHead>
                      <TableHead className="text-xs font-bold">Email</TableHead>
                      <TableHead className="text-xs font-bold">Attached</TableHead>
                      <TableHead className="text-xs font-bold w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myCustomers.map((c) => (
                      <TableRow key={c.mobile}>
                        <TableCell className="text-sm font-medium">{c.customerName || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{c.customerCode || "—"}</TableCell>
                        <TableCell className="text-sm">{c.contactPerson || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{c.mobile}</TableCell>
                        <TableCell className="text-sm">{c.email || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.attachedAt}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => { setEditingCustomerMobile(c.mobile); setCustomerDraft({ ...c }); }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        )}

        {/* SPOC: Edit Customer Modal */}
        <AnimatePresence>
          {editingCustomerMobile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setEditingCustomerMobile(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-lg glass-card-elevated p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold font-display text-foreground mb-4 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" />
                  Edit Customer Details
                </h3>
                <div className="space-y-3">
                  {[
                    { key: "customerName", label: "Customer Name" },
                    { key: "customerCode", label: "Customer Code" },
                    { key: "contactPerson", label: "Contact Person" },
                    { key: "mobile", label: "Mobile (used for login)" },
                    { key: "email", label: "Email" },
                    { key: "address", label: "Address" },
                    { key: "gstin", label: "GSTIN" },
                    { key: "pan", label: "PAN" },
                    { key: "tan", label: "TAN" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                      <input
                        type={f.key === "mobile" ? "tel" : "text"}
                        className="input-glass w-full text-sm"
                        value={(customerDraft as Record<string, string>)[f.key] || ""}
                        onChange={(e) => { setCustomerDraft((prev) => ({ ...prev, [f.key]: e.target.value })); setCustomerEditError(null); }}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                    <textarea
                      className="input-glass w-full text-sm min-h-[60px] resize-y"
                      value={customerDraft.notes || ""}
                      onChange={(e) => setCustomerDraft((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  {customerEditError && (
                    <div className="text-xs text-destructive p-2 rounded-md bg-destructive/10 border border-destructive/30">
                      {customerEditError}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setEditingCustomerMobile(null); setCustomerEditError(null); }} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={() => {
                      if (!editingCustomerMobile) return;
                      const oldMobile = editingCustomerMobile;
                      const { department: _d, attachedAt: _a, ...updates } = customerDraft as Customer;
                      const result = customerStore.update(oldMobile, updates);
                      if (!result.ok) {
                        setCustomerEditError(result.error || "Failed to save changes");
                        return;
                      }
                      // If mobile changed, propagate the new mobile across related stores
                      if (result.newMobile && result.newMobile !== oldMobile) {
                        rekeyRegisteredUser(oldMobile, result.newMobile);
                        rekeyCcRequestMobile(oldMobile, result.newMobile);
                        rekeyRequestMobile(oldMobile, result.newMobile);
                      }
                      setEditingCustomerMobile(null);
                      setCustomerEditError(null);
                    }}
                    className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 inline-flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SPOC: Pending Extension Requests */}
        {role === "spoc" && (() => {
          const extRequests = requests.filter((r) => r.extensionRequest?.status === "pending");
          if (extRequests.length === 0) return null;
          return (
            <div className="glass-card p-6 mb-6">
              <h2 className="text-xl font-bold font-display text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                Extension Requests
                <span className="ml-2 text-sm font-normal text-muted-foreground">({extRequests.length} pending)</span>
              </h2>
              <div className="space-y-4">
                {extRequests.map((req) => (
                  <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl border border-accent/30 bg-accent/[0.03]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{req.id}</h3>
                          <p className="text-sm text-muted-foreground">{req.type} • {req.address}</p>
                        </div>
                      </div>
                      <div className="status-badge bg-accent/10 text-accent">Extension Pending</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <span className="text-muted-foreground">Current Expiry:</span>
                        <span className="ml-2 text-warning font-medium">{req.expiry}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Requested New Date:</span>
                        <span className="ml-2 text-foreground font-medium">{req.extensionRequest?.newEndDate}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Reason:</span>
                        <span className="ml-2 text-foreground">{req.extensionRequest?.reason}</span>
                      </div>
                      {req.extensionRequest?.poUploaded && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">New PO:</span>
                          <span className="ml-2 text-primary font-medium flex items-center gap-1 inline-flex">
                            <FileText className="w-3 h-3" /> {req.extensionRequest.poFileName}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveExtension(req.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-success/10 text-success hover:bg-success/20 transition-all">
                        <CheckCircle2 className="w-4 h-4" /> Approve Extension
                      </button>
                      <button onClick={() => { setExtRejectId(req.id); setExtRejectReason(""); }} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })()}


        {role === "finance" && ccStore.pendingRequests.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-xl font-bold font-display text-foreground mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Customer Code Requests
              <span className="ml-2 text-sm font-normal text-muted-foreground">({ccStore.pendingRequests.length} pending)</span>
            </h2>
            <div className="space-y-4">
              {ccStore.pendingRequests.map((ccReq) => {
                const isExpCC = ccExpandedId === ccReq.id;
                return (
                  <motion.div
                    key={ccReq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-xl border border-accent/30 bg-accent/[0.03]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ccReq.type === "verify" ? "bg-info/10" : "bg-primary/10"}`}>
                          {ccReq.type === "verify" ? <Search className="w-5 h-5 text-info" /> : <Plus className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{ccReq.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {ccReq.type === "verify" ? "Code Verification" : "New Code Creation"} • Mobile: {ccReq.mobile}
                          </p>
                        </div>
                      </div>
                      <div className="status-badge bg-warning/10 text-warning">Pending</div>
                    </div>

                    {/* Customer Details - always show */}
                    <div className="mb-3">
                      <button
                        onClick={() => setCcExpandedId(isExpCC ? null : ccReq.id)}
                        className="text-xs text-primary flex items-center gap-1 mb-2"
                      >
                        {isExpCC ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpCC ? "Hide Details" : "View Customer Details"}
                      </button>

                      <AnimatePresence>
                        {isExpCC && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-3 rounded-lg bg-muted/30 border border-border/50"
                          >
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="col-span-2 mb-1">
                                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Customer Details</span>
                              </div>
                              {ccReq.companyName && (
                                <div>
                                  <span className="text-muted-foreground">Company:</span>
                                  <span className="ml-2 text-foreground">{ccReq.companyName}</span>
                                </div>
                              )}
                              {ccReq.contactPerson && (
                                <div>
                                  <span className="text-muted-foreground">Contact Person:</span>
                                  <span className="ml-2 text-foreground">{ccReq.contactPerson}</span>
                                </div>
                              )}
                              {ccReq.email && (
                                <div>
                                  <span className="text-muted-foreground">Email:</span>
                                  <span className="ml-2 text-foreground">{ccReq.email}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground">Mobile:</span>
                                <span className="ml-2 text-foreground">{ccReq.mobile}</span>
                              </div>

                              {/* Full form details for creation requests */}
                              {ccReq.type === "create" && ccReq.customerForm && (
                                <>
                                  <div className="col-span-2 border-t border-border/50 my-1" />
                                  <div className="col-span-2 mb-1">
                                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Registration Form</span>
                                  </div>
                                  {Object.entries(ccReq.customerForm).filter(([, v]) => v).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                                      <span className="ml-2 text-foreground">{value}</span>
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* Documents */}
                              {ccReq.uploadedDocs && (
                                <>
                                  <div className="col-span-2 border-t border-border/50 my-1" />
                                  <div className="col-span-2 mb-1">
                                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Documents</span>
                                  </div>
                                  {(() => {
                                    const ccDocs = getDocumentsForRequest(ccReq.id);
                                    if (ccDocs.length > 0) {
                                      return (
                                        <div className="col-span-2 space-y-1.5">
                                          {ccDocs.map(({ slot, doc }) => (
                                            <DocumentLink key={slot} doc={doc} variant="card" />
                                          ))}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="col-span-2 flex flex-wrap gap-2">
                                        {Object.entries(ccReq.uploadedDocs!).map(([doc, uploaded]) => (
                                          <span key={doc} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md ${uploaded ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                            {uploaded ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                            {doc.replace(/([A-Z])/g, " $1").trim()}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Download docs (create only) */}
                    {ccReq.type === "create" && (
                      <div className="pt-3 border-t border-border/50 mb-3">
                        <button
                          onClick={async () => {
                            const zip = new JSZip();
                            const lines: string[] = [];
                            lines.push("=== CUSTOMER CODE CREATION REQUEST ===");
                            lines.push(`Request ID: ${ccReq.id}`);
                            lines.push(`Submitted: ${ccReq.createdAt}`);
                            lines.push(`Status: ${ccReq.status}`);
                            lines.push("");
                            lines.push("--- User Details ---");
                            lines.push(`Company Name : ${ccReq.companyName || "-"}`);
                            lines.push(`Contact Person: ${ccReq.contactPerson || "-"}`);
                            lines.push(`Email        : ${ccReq.email || "-"}`);
                            lines.push(`Mobile       : ${ccReq.mobile || "-"}`);
                            if (ccReq.customerForm) {
                              lines.push("");
                              lines.push("--- Registration Form ---");
                              Object.entries(ccReq.customerForm).forEach(([k, v]) => {
                                const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
                                lines.push(`${label}: ${v || "-"}`);
                              });
                            }
                            if (ccReq.uploadedDocs) {
                              lines.push("");
                              lines.push("--- Uploaded Documents ---");
                              Object.entries(ccReq.uploadedDocs).forEach(([doc, up]) => {
                                const label = doc.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
                                lines.push(`${label}: ${up ? "Uploaded" : "Not uploaded"}`);
                              });
                            }
                            zip.file("user-details.txt", lines.join("\n"));

                            if (ccReq.uploadedDocs) {
                              const docsFolder = zip.folder("documents");
                              Object.entries(ccReq.uploadedDocs)
                                .filter(([, up]) => up)
                                .forEach(([doc]) => {
                                  const label = doc.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
                                  const content = `Document: ${label}\nUploaded by: ${ccReq.contactPerson || ccReq.companyName || ccReq.mobile}\nRequest ID: ${ccReq.id}\nSubmitted: ${ccReq.createdAt}\n\n[This is a placeholder file representing the document uploaded by the user.]`;
                                  docsFolder?.file(`${doc}.txt`, content);
                                });
                            }

                            const blob = await zip.generateAsync({ type: "blob" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${ccReq.id}-${ccReq.companyName || ccReq.mobile}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-info/10 text-info hover:bg-info/20 transition-all"
                        >
                          <Download className="w-4 h-4" /> Download Documents
                        </button>
                      </div>
                    )}

                    {/* Approve with code entry */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                      <div className="flex-1 min-w-[240px] flex gap-2">
                        <input
                          type="text"
                          value={ccApproveCode[ccReq.id] || (ccReq.type === "verify" ? ccReq.existingCode || "" : "")}
                          onChange={(e) => setCcApproveCode((prev) => ({ ...prev, [ccReq.id]: e.target.value }))}
                          placeholder={ccReq.type === "verify" ? "Confirm code" : "Enter new Customer Code"}
                          className="input-glass flex-1 text-sm"
                        />
                        <button
                          onClick={() => {
                            const code = ccApproveCode[ccReq.id] || (ccReq.type === "verify" ? ccReq.existingCode : "");
                            if (code) {
                              ccStore.approve(ccReq.id, code);
                              setCcApproveCode((prev) => { const n = { ...prev }; delete n[ccReq.id]; return n; });
                            }
                          }}
                          disabled={!(ccApproveCode[ccReq.id] || (ccReq.type === "verify" ? ccReq.existingCode : ""))}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-success/10 text-success hover:bg-success/20 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Add/Update
                        </button>
                      </div>
                      <button
                        onClick={() => { setCcRejectId(ccReq.id); setCcRejectReason(""); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* CC Reject Modal */}
        <AnimatePresence>
          {ccRejectId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setCcRejectId(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-md glass-card-elevated p-6">
                <h3 className="text-lg font-bold font-display text-foreground mb-4">Reject CC Request</h3>
                <textarea
                  className="input-glass w-full min-h-[80px] resize-none"
                  placeholder="Reason for rejection..."
                  value={ccRejectReason}
                  onChange={(e) => setCcRejectReason(e.target.value)}
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setCcRejectId(null)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={() => { if (ccRejectId && ccRejectReason.trim()) { ccStore.reject(ccRejectId, ccRejectReason.trim()); setCcRejectId(null); } }}
                    disabled={!ccRejectReason.trim()}
                    className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CC History */}
        {role === "finance" && showCcHistory && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Customer Code History
              </h2>
              <div className="flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={ccHistorySearch}
                    onChange={(e) => setCcHistorySearch(e.target.value)}
                    placeholder="Search ID, company, SPOC, mobile, code…"
                    className="input-glass w-full text-sm pl-9"
                  />
                </div>
                <button onClick={() => setShowCcHistory(false)} className="btn-secondary text-sm">Close</button>
              </div>
            </div>
            {ccStore.allRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No CC requests yet.</p>
            ) : (() => {
              const q = ccHistorySearch.trim().toLowerCase();
              const filtered = q
                ? ccStore.allRequests.filter((r) =>
                    [r.id, r.companyName, r.contactPerson, r.mobile, r.approvedCode, r.existingCode, r.email, r.status]
                      .filter(Boolean)
                      .some((v) => String(v).toLowerCase().includes(q))
                  )
                : ccStore.allRequests;
              if (filtered.length === 0) {
                return <p className="text-center text-muted-foreground py-8">No matching CC requests.</p>;
              }
              return (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-bold">ID</TableHead>
                      <TableHead className="text-xs font-bold">Type</TableHead>
                      <TableHead className="text-xs font-bold">Company</TableHead>
                      <TableHead className="text-xs font-bold">SPOC</TableHead>
                      <TableHead className="text-xs font-bold">Mobile</TableHead>
                      <TableHead className="text-xs font-bold">Code</TableHead>
                      <TableHead className="text-xs font-bold">Creation Date</TableHead>
                      <TableHead className="text-xs font-bold">Requisition Date</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((ccReq) => (
                      <TableRow key={ccReq.id}>
                        <TableCell className="text-sm font-medium">{ccReq.id}</TableCell>
                        <TableCell className="text-sm">{ccReq.type === "verify" ? "Verification" : "New Creation"}</TableCell>
                        <TableCell className="text-sm">{ccReq.companyName || "—"}</TableCell>
                        <TableCell className="text-sm">{ccReq.contactPerson || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{ccReq.mobile}</TableCell>
                        <TableCell className="text-sm font-mono">{ccReq.approvedCode || ccReq.existingCode || "—"}</TableCell>
                        <TableCell className="text-sm">{ccReq.createdAt}</TableCell>
                        <TableCell className="text-sm">{ccReq.status === "approved" ? (ccReq.approvedAt || "—") : "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            ccReq.status === "approved" ? "bg-success/10 text-success" :
                            ccReq.status === "rejected" ? "bg-destructive/10 text-destructive" :
                            "bg-warning/10 text-warning"
                          }`}>
                            {ccReq.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                            {ccReq.status === "rejected" && <XCircle className="w-3 h-3" />}
                            {ccReq.status === "pending" && <Clock className="w-3 h-3" />}
                            {ccReq.status.charAt(0).toUpperCase() + ccReq.status.slice(1)}
                          </span>
                          {ccReq.status === "rejected" && ccReq.rejectionReason && (
                            <p className="text-[10px] text-destructive/70 mt-1">{ccReq.rejectionReason}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              );
            })()}
          </motion.div>
        )}

        {/* Request List */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold font-display text-foreground mb-6 capitalize">{dashFilter === "all" ? "All" : dashFilter} Requests</h2>

          {displayRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">No {dashFilter} requests. All caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayRequests.map((req, i) => {
                const stages = getWorkflowStages(req.workflowType);
                const currentStage = getCurrentStage(req.workflowType, req.stageIndex);
                const timelineLabels = getTimelineLabels(req.workflowType);
                const isExpanded = expandedId === req.id;
                const isCompleted = req.stageIndex >= stages.length - 1;
                const isMine = STAGE_ROLE_MAP[currentStage.id] === role && !isCompleted;

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-5 rounded-xl border ${isMine ? "border-accent/30 bg-accent/[0.03]" : "border-border"}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          req.utility === "Power" ? "bg-primary/10" : "bg-info/10"
                        }`}>
                          {req.utility === "Power" ? (
                            <Zap className="w-5 h-5 text-primary" />
                          ) : (
                            <Droplets className="w-5 h-5 text-info" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{req.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {req.utility} • {req.type} • {req.addressId}
                          </p>
                        </div>
                      </div>
                      <div className={`status-badge ${isCompleted ? "status-approved" : "bg-accent/10 text-accent"}`}>
                        {isCompleted ? "Completed" : currentStage.label}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-1 mb-1">
                      {stages.map((stage, si) => (
                        <div key={stage.id} className="flex items-center flex-1 last:flex-none">
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                              si <= req.stageIndex ? "bg-primary" : "bg-muted"
                            }`}
                            title={stage.label}
                          />
                          {si < stages.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-0.5 rounded ${
                              si < req.stageIndex ? "bg-primary" : "bg-muted"
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mb-4">
                      <span className="text-[10px] text-muted-foreground">{timelineLabels[0]}</span>
                      <span className="text-[10px] text-muted-foreground">{timelineLabels[timelineLabels.length - 1]}</span>
                    </div>

                    {/* Expandable details */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="text-xs text-primary flex items-center gap-1 mb-3"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Hide Details" : "View Details"}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {/* ── Request Information ── */}
                            <div className="col-span-2 mb-1">
                              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Request Information</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Request ID:</span>
                              <span className="ml-2 text-foreground font-medium">{req.id}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Submitted:</span>
                              <span className="ml-2 text-foreground">{req.date}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Utility:</span>
                              <span className="ml-2 text-foreground">{req.utility}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Connection Type:</span>
                              <span className="ml-2 text-foreground">{req.type}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Workflow:</span>
                              <span className="ml-2 text-foreground">{getWorkflowLabel(req.workflowType)}</span>
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {editAddrReqId === req.id ? (
                                    <div className="space-y-2">
                                      <div>
                                        <label className="text-xs text-muted-foreground block mb-1">Address ({req.addressId})</label>
                                        <textarea
                                          value={editAddrValue}
                                          onChange={(e) => setEditAddrValue(e.target.value)}
                                          rows={2}
                                          className="input-glass w-full text-sm resize-none"
                                          placeholder="Connection address"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground block mb-1">Space ID (optional)</label>
                                        <input
                                          type="text"
                                          value={editSpaceIdValue}
                                          onChange={(e) => setEditSpaceIdValue(e.target.value)}
                                          className="input-glass w-full text-sm font-mono"
                                          placeholder="e.g. SPC-2041"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            if (!editAddrValue.trim()) return;
                                            updateRequestAddress(req.id, editAddrValue, editSpaceIdValue);
                                            setEditAddrReqId(null);
                                          }}
                                          className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"
                                        >
                                          <Save className="w-3 h-3" /> Save
                                        </button>
                                        <button
                                          onClick={() => setEditAddrReqId(null)}
                                          className="btn-secondary text-xs px-3 py-1.5"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div>
                                        <span className="text-muted-foreground">Address:</span>
                                        <span className="ml-2 text-foreground">{req.address} ({req.addressId})</span>
                                      </div>
                                      {req.spaceId && (
                                        <div className="mt-1">
                                          <span className="text-muted-foreground">Space ID:</span>
                                          <span className="ml-2 text-foreground font-mono">{req.spaceId}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                {role === "spoc" && editAddrReqId !== req.id && (
                                  <button
                                    onClick={() => {
                                      setEditAddrReqId(req.id);
                                      setEditAddrValue(req.address);
                                      setEditSpaceIdValue(req.spaceId || "");
                                    }}
                                    className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                                    aria-label="Edit address"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Current Stage:</span>
                              <span className="ml-2 text-foreground font-medium">{currentStage.label}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Progress:</span>
                              <span className="ml-2 text-foreground">{Math.min(req.stageIndex + 1, stages.length)} / {stages.length} steps</span>
                            </div>
                            {req.expiry && (
                              <div>
                                <span className="text-muted-foreground">Expiry:</span>
                                <span className="ml-2 text-warning font-medium">{req.expiry}</span>
                              </div>
                            )}

                            {/* ── Customer Details ── */}
                            {(() => {
                              const ud = req.userDetails;
                              const regUser = ud?.mobile ? getRegisteredUser(ud.mobile) : undefined;
                              const name = ud?.customerName || regUser?.companyName;
                              const code = ud?.customerCode || regUser?.customerCode;
                              const contact = ud?.contactPerson || regUser?.contactPerson;
                              const mob = ud?.mobile;
                              const em = ud?.email || regUser?.email;
                              const hasAny = name || code || contact || mob || em;
                              if (!hasAny) return null;
                              return (
                                <>
                                  <div className="col-span-2 border-t border-border/50 my-1" />
                                  <div className="col-span-2 mb-1">
                                    <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                                      <User className="w-3 h-3" /> Customer Details
                                    </span>
                                  </div>
                                  {name && (
                                    <div>
                                      <span className="text-muted-foreground">Customer Name:</span>
                                      <span className="ml-2 text-foreground">{name}</span>
                                    </div>
                                  )}
                                  {code && (
                                    <div>
                                      <span className="text-muted-foreground">Customer Code:</span>
                                      <span className="ml-2 text-foreground font-mono">{code}</span>
                                    </div>
                                  )}
                                  {contact && (
                                    <div>
                                      <span className="text-muted-foreground">Contact Person:</span>
                                      <span className="ml-2 text-foreground">{contact}</span>
                                    </div>
                                  )}
                                  {mob && (
                                    <div>
                                      <span className="text-muted-foreground">Mobile:</span>
                                      <span className="ml-2 text-foreground">{mob}</span>
                                    </div>
                                  )}
                                  {em && (
                                    <div>
                                      <span className="text-muted-foreground">Email:</span>
                                      <span className="ml-2 text-foreground">{em}</span>
                                    </div>
                                  )}
                                  {/* Show full registration form if available from registry */}
                                  {regUser?.customerForm && (
                                    <>
                                      <div className="col-span-2 border-t border-border/50 my-1" />
                                      <div className="col-span-2 mb-1">
                                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Registration Details</span>
                                      </div>
                                      {Object.entries(regUser.customerForm).filter(([, v]) => v).map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                                          <span className="ml-2 text-foreground">{value}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </>
                              );
                            })()}

                            {/* ── Workflow Status Details ── */}
                            {(req.sdDecision || req.siteVisitDate || (req.completedActions && req.completedActions.length > 0)) && (
                              <>
                                <div className="col-span-2 border-t border-border/50 my-1" />
                                <div className="col-span-2 mb-1">
                                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Workflow Status</span>
                                </div>
                                {req.sdDecision && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">SD Status:</span>
                                    <span className={`ml-2 font-medium ${
                                      req.sdDecision === "waived" ? "text-warning" :
                                      req.sdDecision === "collected" ? "text-success" : "text-accent"
                                    }`}>
                                      {req.sdDecision === "waived" ? "Waived" :
                                       req.sdDecision === "collected" ? "Already Collected" : "Pending Collection"}
                                    </span>
                                    {req.sdDecision === "pending" && req.sdAmount && (
                                      <span className="ml-2 text-foreground font-semibold">₹{req.sdAmount}</span>
                                    )}
                                    {req.sdDecision === "waived" && req.sdWaiverProof && (
                                      <span className="ml-2 text-muted-foreground text-xs">(Waiver proof attached)</span>
                                    )}
                                  </div>
                                )}
                                {req.siteVisitDate && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Site Visit:</span>
                                    <span className="ml-2 text-info font-medium">{req.siteVisitDate}</span>
                                  </div>
                                )}
                                {req.completedActions && req.completedActions.length > 0 && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Actions Completed:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {req.completedActions.map((action) => (
                                        <span key={action} className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-xs rounded-md">
                                          <CheckCircle2 className="w-3 h-3" /> {action}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* ── Uploaded Documents (live) ── */}
                            {(() => {
                              const reqDocs = getDocumentsForRequest(req.id);
                              if (reqDocs.length === 0 && (!req.submittedDocs || req.submittedDocs.length === 0)) return null;
                              return (
                                <>
                                  <div className="col-span-2 border-t border-border/50 my-1" />
                                  <div className="col-span-2 mb-1">
                                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Uploaded Documents</span>
                                  </div>
                                  {reqDocs.length > 0 && (
                                    <div className="col-span-2 space-y-1.5">
                                      {reqDocs.map(({ slot, doc }) => (
                                        <DocumentLink key={slot} doc={doc} variant="card" />
                                      ))}
                                    </div>
                                  )}
                                  {req.submittedDocs && req.submittedDocs.length > 0 && (
                                    <div className="col-span-2">
                                      <div className="flex flex-wrap gap-1">
                                        {req.submittedDocs.map((doc) => (
                                          <span key={doc} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md">
                                            <FileText className="w-3 h-3" /> {doc}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {/* ── Load & Appliances ── */}
                            {req.loadData && (
                              <>
                                <div className="col-span-2 border-t border-border/50 my-1" />
                                <div className="col-span-2 mb-1">
                                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Load Information</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Method:</span>
                                  <span className="ml-2 text-foreground capitalize">{req.loadData.method === "calculator" ? "AI Calculator" : "Document Upload"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total Load:</span>
                                  <span className="ml-2 text-foreground font-semibold">{req.loadData.totalKW.toFixed(2)} kW</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Max Demand:</span>
                                  <span className="ml-2 text-foreground font-semibold">{req.loadData.totalKVA.toFixed(2)} kVA</span>
                                </div>
                                {req.loadData.docUploaded && (
                                  <div>
                                    <span className="text-muted-foreground">Load Document:</span>
                                    <span className="ml-2 text-success font-medium">Uploaded</span>
                                  </div>
                                )}
                                {req.loadData.appliances && req.loadData.appliances.length > 0 && (
                                  <div className="col-span-2 mt-1">
                                    <span className="text-muted-foreground text-xs">Appliance Breakdown:</span>
                                    <div className="mt-1.5 rounded-lg border border-border/50 overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="bg-muted/50">
                                            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Appliance</th>
                                            <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Qty</th>
                                            <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">kW/unit</th>
                                            <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Total kW</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {req.loadData.appliances.map((a) => (
                                            <tr key={a.name} className="border-t border-border/30">
                                              <td className="px-3 py-1.5 text-foreground">{a.name}</td>
                                              <td className="px-3 py-1.5 text-center text-foreground">{a.qty}</td>
                                              <td className="px-3 py-1.5 text-right text-muted-foreground">{a.kw.toFixed(3)}</td>
                                              <td className="px-3 py-1.5 text-right text-foreground font-medium">{(a.kw * a.qty).toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* ── Water Demand ── */}
                            {req.waterDemand && (
                              <>
                                <div className="col-span-2 border-t border-border/50 my-1" />
                                <div className="col-span-2 mb-1">
                                  <span className="text-xs font-semibold text-info uppercase tracking-wider">Water Demand (per day)</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Domestic Use:</span>
                                  <span className="ml-2 text-foreground font-semibold">{req.waterDemand.domesticKL.toFixed(1)} KL</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Flushing Use:</span>
                                  <span className="ml-2 text-foreground font-semibold">{req.waterDemand.flushingKL.toFixed(1)} KL</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">RO Water:</span>
                                  <span className="ml-2 text-foreground font-semibold">{req.waterDemand.roKL.toFixed(1)} KL</span>
                                </div>
                                <div className="col-span-2 p-2 rounded-lg bg-info/5 border border-info/10">
                                  <span className="text-muted-foreground">Total Daily Demand:</span>
                                  <span className="ml-2 text-info font-bold text-base">{req.waterDemand.totalKL.toFixed(1)} KL/day</span>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons - only for pending requests assigned to this role */}
                    {isMine && (
                      <div className="flex gap-2 pt-3 border-t border-border/50">
                        {/* SPOC: Edit Connection Type button */}
                        {role === "spoc" && currentStage.id === "spoc-approval" && (
                          <button
                            onClick={() => {
                              setEditTypeReqId(req.id);
                              setEditTypeValue(req.workflowType);
                              // Initialize hierarchical state from current workflow type
                              if (req.utility === "Power") {
                                if (req.workflowType === "power-temporary") {
                                  setEditPowerCategory("temporary");
                                  setEditMeterType(null);
                                  setEditBillingType(null);
                                } else {
                                  setEditPowerCategory("regular");
                                  if (req.workflowType === "power-prepaid") {
                                    setEditMeterType("metered");
                                    setEditBillingType("prepaid");
                                  } else if (req.workflowType === "power-regular") {
                                    setEditMeterType("metered");
                                    setEditBillingType("postpaid");
                                  } else {
                                    setEditMeterType("non-metered");
                                    setEditBillingType(null);
                                  }
                                }
                                setEditWaterType(null);
                              } else {
                                setEditPowerCategory(null);
                                setEditMeterType(null);
                                setEditBillingType(null);
                                setEditWaterType(req.workflowType === "water-no-meter" ? "new" : "existing");
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-warning/10 text-warning hover:bg-warning/20 transition-all active:scale-[0.97]"
                            title="Edit Connection Type"
                          >
                            <Pencil className="w-4 h-4" /> Edit Type
                          </button>
                        )}
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-success/10 text-success hover:bg-success/20 transition-all active:scale-[0.97]"
                        >
                          <CheckCircle2 className="w-4 h-4" /> {(role === "pne" || role === "spoc") && (currentStage.id === "site-visit" || currentStage.id === "slotting") ? "Schedule Slot" : currentStage.id === "site-visit-form" ? "Fill Site Visit Form" : "Approve"}
                        </button>
                        <button
                          onClick={() => setRejectModalId(req.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-[0.97]"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Site Visit Calendar Modal */}
      <AnimatePresence>
        {siteVisitReqId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => { setSiteVisitReqId(null); setSiteVisitDate(undefined); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-sm glass-card-elevated p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-foreground">Schedule Site Visit</h3>
                  <p className="text-sm text-muted-foreground">{siteVisitReqId}</p>
                </div>
              </div>

              <Calendar
                mode="single"
                selected={siteVisitDate}
                onSelect={setSiteVisitDate}
                disabled={(date) => date < new Date()}
                className={cn("p-3 pointer-events-auto rounded-xl border border-border")}
              />

              {siteVisitDate && (
                <p className="text-sm text-foreground mt-3 text-center font-medium">
                  Selected: {format(siteVisitDate, "dd MMMM yyyy")}
                </p>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => { setSiteVisitReqId(null); setSiteVisitDate(undefined); }} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSiteVisit}
                  disabled={!siteVisitDate}
                  className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SD Decision Modal */}
      <AnimatePresence>
        {sdModalReqId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => { setSdModalReqId(null); setSdChoice(null); setSdWaiverFile(""); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md glass-card-elevated p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-foreground">Security Deposit Decision</h3>
                  <p className="text-sm text-muted-foreground">{sdModalReqId}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">What is the status of the Security Deposit for this request?</p>

              <div className="space-y-3">
                {([
                  { value: "collected" as SdDecision, label: "Already Collected", desc: "SD has already been collected from the customer.", color: "border-success/40 bg-success/5" },
                  { value: "pending" as SdDecision, label: "Yet to be Collected", desc: "SD is pending — customer will need to pay and upload proof.", color: "border-accent/40 bg-accent/5" },
                  { value: "waived" as SdDecision, label: "Waived Off", desc: "SD has been waived — attach email proof of waiver.", color: "border-warning/40 bg-warning/5" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSdChoice(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      sdChoice === opt.value ? opt.color + " ring-2 ring-primary" : "border-border hover:border-primary/20"
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {sdChoice === "pending" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Security Deposit Amount (₹)</label>
                  <input
                    type="number"
                    className="input-glass w-full"
                    placeholder="Enter amount in rupees..."
                    value={sdAmountValue}
                    onChange={(e) => setSdAmountValue(e.target.value)}
                    min="0"
                  />
                </div>
              )}

              {sdChoice === "waived" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Proof of Waiver</label>
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-muted/30">
                    {sdWaiverFile ? (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <FileText className="w-4 h-4 text-primary" />
                        {sdWaiverFile}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload waiver email proof</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setSdWaiverFile(f.name); setSdWaiverFileObj(f); }
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setSdModalReqId(null); setSdChoice(null); setSdWaiverFile(""); setSdAmountValue(""); }} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleSdSubmit}
                  disabled={!sdChoice || (sdChoice === "waived" && !sdWaiverFile) || (sdChoice === "pending" && !sdAmountValue)}
                  className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setRejectModalId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md glass-card-elevated p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-foreground">Reject / Request Clarification</h3>
                  <p className="text-sm text-muted-foreground">{rejectModalId}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <textarea
                  className="input-glass w-full min-h-[100px] resize-none"
                  placeholder="Enter reason for rejection or clarification needed..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setRejectModalId(null); setRejectReason(""); }} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Site Visit Form Modal */}
      {actionModalAction && (
        <WorkflowActionModal
          open={!!actionModalReqId}
          onClose={() => { setActionModalReqId(null); setActionModalAction(null); }}
          onSubmit={() => {
            if (actionModalReqId) advanceStage(actionModalReqId);
            setActionModalReqId(null);
            setActionModalAction(null);
          }}
          requestId={actionModalReqId || ""}
          action={actionModalAction}
          onFilesUploaded={(files) => {
            if (!actionModalReqId || !actionModalAction) return;
            Object.entries(files).forEach(([fieldName, file]) => {
              saveDocument(actionModalReqId, `${actionModalAction.label}-${fieldName}`, file, `${actionModalAction.label} – ${fieldName}`);
            });
          }}
        />
      )}

      {/* Edit Connection Type Modal (SPOC only) */}
      <AnimatePresence>
        {editTypeReqId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setEditTypeReqId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md glass-card-elevated p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-foreground">Edit Connection Type</h3>
                  <p className="text-sm text-muted-foreground">{editTypeReqId}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">Change the connection type for this request. The workflow will be updated accordingly.</p>

              {(() => {
                const editReq = requests.find((r) => r.id === editTypeReqId);
                const isPower = editReq?.utility === "Power";
                const isWater = editReq?.utility === "Water";

                // Derive workflow type from hierarchical state
                const derivedWorkflow: WorkflowType | null = (() => {
                  if (isPower) {
                    if (editPowerCategory === "temporary") return "power-temporary";
                    if (editPowerCategory === "regular") {
                      if (editMeterType === "non-metered") return "power-prepaid";
                      if (editMeterType === "metered" && editBillingType === "postpaid") return "power-regular";
                      if (editMeterType === "metered" && editBillingType === "prepaid") return "power-prepaid";
                    }
                  }
                  if (isWater) {
                    if (editWaterType === "existing") return "water-existing-meter";
                    if (editWaterType === "new") return "water-no-meter";
                  }
                  return null;
                })();

                const isComplete = isPower
                  ? (editPowerCategory === "temporary") ||
                    (editPowerCategory === "regular" && editMeterType === "non-metered") ||
                    (editPowerCategory === "regular" && editMeterType === "metered" && editBillingType !== null)
                  : editWaterType !== null;

                return (
                  <>
                    {isPower && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Connection Category</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => { setEditPowerCategory("regular"); setEditMeterType(null); setEditBillingType(null); setEditTypeTempDates({ from: "", to: "" }); }}
                              className={`p-4 rounded-xl border-2 transition-all text-left ${editPowerCategory === "regular" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                            >
                              <Layers className="w-5 h-5 text-primary mb-1" />
                              <p className="font-semibold text-sm text-foreground">Regular</p>
                              <p className="text-xs text-muted-foreground">Permanent</p>
                            </button>
                            <button
                              onClick={() => { setEditPowerCategory("temporary"); setEditMeterType(null); setEditBillingType(null); }}
                              className={`p-4 rounded-xl border-2 transition-all text-left ${editPowerCategory === "temporary" ? "border-warning bg-warning/5" : "border-border hover:border-warning/30"}`}
                            >
                              <Clock className="w-5 h-5 text-warning mb-1" />
                              <p className="font-semibold text-sm text-foreground">Temporary</p>
                              <p className="text-xs text-muted-foreground">Time-limited</p>
                            </button>
                          </div>
                        </div>

                        {editPowerCategory === "temporary" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-foreground mb-1.5 block">Start Date</label>
                              <input type="date" value={editTypeTempDates.from} onChange={(e) => setEditTypeTempDates((prev) => ({ ...prev, from: e.target.value }))} className="input-glass w-full" />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-foreground mb-1.5 block">End Date</label>
                              <input type="date" value={editTypeTempDates.to} onChange={(e) => setEditTypeTempDates((prev) => ({ ...prev, to: e.target.value }))} className="input-glass w-full" />
                            </div>
                          </motion.div>
                        )}

                        {editPowerCategory === "regular" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Meter Type</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => { setEditMeterType("metered"); setEditBillingType(null); }}
                                className={`p-3 rounded-xl border-2 transition-all text-left ${editMeterType === "metered" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                              >
                                <p className="font-semibold text-sm text-foreground">Metered</p>
                                <p className="text-xs text-muted-foreground">With energy meter</p>
                              </button>
                              <button
                                onClick={() => { setEditMeterType("non-metered"); setEditBillingType(null); }}
                                className={`p-3 rounded-xl border-2 transition-all text-left ${editMeterType === "non-metered" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"}`}
                              >
                                <p className="font-semibold text-sm text-foreground">Non-Metered</p>
                                <p className="text-xs text-muted-foreground">Flat rate</p>
                              </button>
                            </div>

                            {editMeterType === "metered" && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Billing Type</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    onClick={() => setEditBillingType("postpaid")}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${editBillingType === "postpaid" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                                  >
                                    <p className="font-semibold text-sm text-foreground">Postpaid</p>
                                    <p className="text-xs text-muted-foreground">Billed monthly</p>
                                  </button>
                                  <button
                                    onClick={() => setEditBillingType("prepaid")}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${editBillingType === "prepaid" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"}`}
                                  >
                                    <p className="font-semibold text-sm text-foreground">Prepaid</p>
                                    <p className="text-xs text-muted-foreground">Recharge first</p>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {isWater && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Water Connection Type</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setEditWaterType("existing")}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${editWaterType === "existing" ? "border-info bg-info/5" : "border-border hover:border-info/30"}`}
                          >
                            <p className="font-semibold text-sm text-foreground">Existing Meter</p>
                            <p className="text-xs text-muted-foreground">Already installed</p>
                          </button>
                          <button
                            onClick={() => setEditWaterType("new")}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${editWaterType === "new" ? "border-info bg-info/5" : "border-border hover:border-info/30"}`}
                          >
                            <p className="font-semibold text-sm text-foreground">New Meter</p>
                            <p className="text-xs text-muted-foreground">Need new meter</p>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setEditTypeReqId(null)} className="btn-secondary flex-1">Cancel</button>
                      <button
                        onClick={() => {
                          if (editTypeReqId && derivedWorkflow) {
                            const opt = CONNECTION_TYPE_OPTIONS.find((o) => o.value === derivedWorkflow);
                            if (opt) {
                              updateConnectionType(editTypeReqId, derivedWorkflow, opt.label.split(" – ")[1] || opt.label);
                            }
                            setEditTypeReqId(null);
                            setEditTypeValue("");
                            setEditTypeTempDates({ from: "", to: "" });
                          }
                        }}
                        disabled={!isComplete}
                        className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                      >
                        Update Type
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extension Reject Modal (SPOC) */}
      <AnimatePresence>
        {extRejectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setExtRejectId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-md glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-foreground">Reject Extension</h3>
                  <p className="text-sm text-muted-foreground">{extRejectId}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason for Rejection</label>
                <textarea className="input-glass w-full min-h-[100px] resize-none" placeholder="Enter reason..." value={extRejectReason} onChange={(e) => setExtRejectReason(e.target.value)} />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setExtRejectId(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => { rejectExtension(extRejectId, extRejectReason.trim()); setExtRejectId(null); setExtRejectReason(""); }}
                  disabled={!extRejectReason.trim()}
                  className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InternalDashboard;
