import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Droplets, Clock, CheckCircle2, AlertCircle, Plus, BarChart3,
  AlertTriangle, LogOut, RefreshCw, Calendar, ChevronDown, ChevronUp, FileText, Info,
  Upload, XCircle, TimerOff, Search, X,
} from "lucide-react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "./ui/table";
import WorkflowActionModal, { type WorkflowAction } from "./WorkflowActionModal";
import { type WorkflowType, getWorkflowStages, getCurrentStage, getTimelineLabels, getWorkflowLabel, getWaterMeterUploadActions } from "@/lib/workflows";
import { useRequestStore, type ExtensionRequest } from "@/lib/requestStore";
import { getPowerMeterRows, getPowerFooterNote, getWaterRecommendation, subscribeMeterRecommendation, type PowerMeterRow } from "@/lib/meterRecommendationStore";
import { saveDocument, useDocumentStore } from "@/lib/documentStore";
import DocumentLink from "./DocumentLink";

interface ConnectionDashboardProps {
  onNewRequest: () => void;
  onLogout?: () => void;
}

type DashFilter = "all" | "action" | "progress" | "approved" | "rejected";

const ConnectionDashboard = ({ onNewRequest, onLogout }: ConnectionDashboardProps) => {
  const { requests, advanceStage, markActionCompleted, clearRejection, requestExtension, deactivateConnection, selectPowerMeter, submitSdSlice, submitMeterSlice } = useRequestStore();
  const { getDocumentsForRequest } = useDocumentStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [dashFilter, setDashFilter] = useState<DashFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [meterRecsOpen, setMeterRecsOpen] = useState<string | null>(null);
  const [powerRows, setPowerRows] = useState<PowerMeterRow[]>(getPowerMeterRows());
  const [powerFooter, setPowerFooter] = useState(getPowerFooterNote());
  const [waterRecMsg, setWaterRecMsg] = useState(getWaterRecommendation());

  // Extension / Deactivation state
  const [extModalReqId, setExtModalReqId] = useState<string | null>(null);
  const [extNewDate, setExtNewDate] = useState("");
  const [extReason, setExtReason] = useState("");
  const [extPoFile, setExtPoFile] = useState("");
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeMeterRecommendation(() => {
      setPowerRows(getPowerMeterRows());
      setPowerFooter(getPowerFooterNote());
      setWaterRecMsg(getWaterRecommendation());
    });
  }, []);

  const handleActionClick = (reqId: string, action: WorkflowAction) => {
    setActiveRequestId(reqId);
    setActiveAction(action);
    setModalOpen(true);
  };

  const handleActionSubmit = () => {
    if (!activeRequestId || !activeAction) return;
    const req = requests.find((r) => r.id === activeRequestId);
    if (!req) return;

    const currentStage = getCurrentStage(req.workflowType, req.stageIndex);

    // Combined parallel SD + Meter stage: route each action to its slice instead of advancing.
    if (currentStage.id === "sd-and-meter") {
      if (activeAction.label === "Upload SD Payment Proof") {
        submitSdSlice(activeRequestId);
      } else if (activeAction.label === "Upload Calibration Certificate") {
        submitMeterSlice(activeRequestId);
      }
      setModalOpen(false);
      setActiveRequestId(null);
      setActiveAction(null);
      return;
    }

    // For water meter-purchase, use dynamic actions count
    const dynamicActions = (currentStage.id === "meter-purchase" && req.utility === "Water" && req.waterDemand)
      ? getWaterMeterUploadActions(req.waterDemand)
      : currentStage.actions;
    const totalActions = dynamicActions?.length ?? 0;
    const alreadyCompleted = req.completedActions ?? [];
    const updated = [...new Set([...alreadyCompleted, activeAction.label])];

    if (totalActions > 1 && updated.length < totalActions) {
      markActionCompleted(activeRequestId, updated);
    } else {
      markActionCompleted(activeRequestId, []);
      advanceStage(activeRequestId);
    }

    setModalOpen(false);
    setActiveRequestId(null);
    setActiveAction(null);
  };

  // Compute counts dynamically
  const approvedRequests = requests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    return r.stageIndex >= stages.length - 1;
  });
  // A rejection is "actionable" by the customer if EITHER the rejected stage itself
  // requires a customer action, OR the customer was bumped back to a stage that does
  // (e.g. SD Verification rejection sends them back to SD Payment, which they can redo).
  const isActionableRejection = (r: typeof requests[number]) => {
    if (!r.rejectionReason) return false;
    const stages = getWorkflowStages(r.workflowType);
    const currentStage = getCurrentStage(r.workflowType, r.stageIndex);
    if (currentStage.userActionRequired) return true;
    const rejectedStage = r.rejectedFromStageId ? stages.find((s) => s.id === r.rejectedFromStageId) : undefined;
    return !!rejectedStage?.userActionRequired;
  };
  const rejectedRequests = requests.filter((r) => !!r.rejectionReason);
  const actionRequests = requests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    const stage = getCurrentStage(r.workflowType, r.stageIndex);
    if (r.stageIndex >= stages.length - 1) return false;
    if (r.rejectionReason) return isActionableRejection(r);
    return stage.userActionRequired;
  });
  const progressRequests = requests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    const stage = getCurrentStage(r.workflowType, r.stageIndex);
    return r.stageIndex < stages.length - 1 && !stage.userActionRequired && !r.rejectionReason;
  });

  const stats = [
    { label: "Total Requests", value: String(requests.length), icon: <BarChart3 className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/10", filter: "all" as DashFilter },
    { label: "Take Action", value: String(actionRequests.length), icon: <AlertTriangle className="w-5 h-5" />, color: "text-accent", bg: "bg-accent/10", filter: "action" as DashFilter },
    { label: "In Progress", value: String(progressRequests.length), icon: <Clock className="w-5 h-5" />, color: "text-warning", bg: "bg-warning/10", filter: "progress" as DashFilter },
    { label: "Approved", value: String(approvedRequests.length), icon: <CheckCircle2 className="w-5 h-5" />, color: "text-success", bg: "bg-success/10", filter: "approved" as DashFilter },
    { label: "Rejected", value: String(rejectedRequests.length), icon: <XCircle className="w-5 h-5" />, color: "text-destructive", bg: "bg-destructive/10", filter: "rejected" as DashFilter },
  ];

  const baseFiltered =
    dashFilter === "all" ? requests :
    dashFilter === "action" ? actionRequests :
    dashFilter === "progress" ? progressRequests :
    dashFilter === "approved" ? approvedRequests :
    rejectedRequests;

  const q = searchQuery.trim().toLowerCase();
  const filteredRequests = q
    ? baseFiltered.filter((r) => {
        const ud = r.userDetails;
        return [
          r.id, r.address, r.addressId, r.spaceId, r.utility, r.type,
          ud?.customerName, ud?.customerCode, ud?.contactPerson, ud?.mobile, ud?.email,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
    : baseFiltered;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your utility connections</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onNewRequest} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </button>
          {onLogout && (
            <button onClick={onLogout} className="btn-secondary flex items-center gap-2 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          )}
        </div>
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
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Stats as filter buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setDashFilter(stat.filter)}
            className={`glass-card p-4 text-left transition-all ${dashFilter === stat.filter ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
          >
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-2`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Requests */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-display text-foreground">
            {stats.find((s) => s.filter === dashFilter)?.label ?? "Requests"}
          </h2>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-muted-foreground">No requests to show.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req, i) => {
              const stages = getWorkflowStages(req.workflowType);
              const currentStage = getCurrentStage(req.workflowType, req.stageIndex);
              const timelineLabels = getTimelineLabels(req.workflowType);
              const isCompleted = req.stageIndex >= stages.length - 1;
              const actionRequired = currentStage.userActionRequired && !isCompleted;
              const hasRejection = !!req.rejectionReason;

              const statusLabel = isCompleted ? "Connection Activated" : "In Process";
              const statusClass = isCompleted ? "status-approved" : hasRejection ? "status-rejected" : actionRequired ? "bg-accent/10 text-accent" : "status-pending";

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-5 rounded-xl border transition-all ${
                    hasRejection
                      ? "border-destructive/40 bg-destructive/[0.03]"
                      : actionRequired
                        ? "border-accent/40 bg-accent/[0.03] shadow-[0_0_0_1px_hsl(var(--accent)/0.1)]"
                        : "border-border hover:border-primary/20"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{req.id}</h3>
                          {actionRequired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent">
                              <AlertTriangle className="w-3 h-3" />
                              Action Required
                            </span>
                          )}
                          {hasRejection && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/15 text-destructive">
                              <AlertCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {req.utility} • {req.type} • {req.addressId}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`status-badge ${statusClass}`}>
                        {statusLabel}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{currentStage.label}</span>
                    </div>
                  </div>

                  {/* Site visit date */}
                  {req.siteVisitDate && currentStage.id !== "activated" && req.stageIndex < stages.length - 1 && (
                    <div className="mb-3 p-2 rounded-lg bg-info/5 border border-info/10 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-info" />
                      <p className="text-xs text-info font-medium">Site Visit Scheduled for {req.siteVisitDate}</p>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="flex items-center gap-1">
                    {stages.map((stage, si) => (
                      <div key={stage.id} className="flex items-center flex-1 last:flex-none">
                        {req.rejectedFromStageId === stage.id ? (
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-destructive flex items-center justify-center text-destructive-foreground"
                            title={`${stage.label} — Rejected`}
                          >
                            <X className="w-2 h-2" strokeWidth={3} />
                          </div>
                        ) : (
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                              si <= req.stageIndex ? "bg-primary" : "bg-muted"
                            }`}
                            title={stage.label}
                          />
                        )}
                        {si < stages.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-0.5 rounded ${
                            si < req.stageIndex ? "bg-primary" : "bg-muted"
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{timelineLabels[0]}</span>
                    <span className="text-[10px] text-muted-foreground">{timelineLabels[timelineLabels.length - 1]}</span>
                  </div>

                  {/* View Details Toggle */}
                  <button
                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    className="text-xs text-primary flex items-center gap-1 mt-3 mb-1"
                  >
                    {expandedId === req.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expandedId === req.id ? "Hide Details" : "View Details"}
                  </button>

                  <AnimatePresence>
                    {expandedId === req.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/50"
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
                          <div>
                            <span className="text-muted-foreground">Address:</span>
                            <span className="ml-2 text-foreground">{req.address} ({req.addressId})</span>
                          </div>
                          {req.spaceId && (
                            <div>
                              <span className="text-muted-foreground">Space ID:</span>
                              <span className="ml-2 text-foreground font-mono">{req.spaceId}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Current Stage:</span>
                            <span className="ml-2 text-foreground font-medium">
                              {currentStage.label}
                              {currentStage.id === "sd-payment" && req.sdDecision === "pending" && req.sdAmount && (
                                <span className="ml-1 text-accent font-semibold">(₹{Number(req.sdAmount).toLocaleString("en-IN")})</span>
                              )}
                            </span>
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
                          {req.selectedMeter && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Selected Meter:</span>
                              <span className="ml-2 text-foreground font-medium">
                                {req.selectedMeter.make} — {req.selectedMeter.model}
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({req.selectedMeter.conn}, CT: {req.selectedMeter.ct})
                              </span>
                            </div>
                          )}

                          {/* ── Customer Details ── */}
                          {req.userDetails && (
                            <>
                              <div className="col-span-2 border-t border-border/50 my-1" />
                              <div className="col-span-2 mb-1">
                                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Customer Details</span>
                              </div>
                              {req.userDetails.customerName && (
                                <div>
                                  <span className="text-muted-foreground">Name:</span>
                                  <span className="ml-2 text-foreground">{req.userDetails.customerName}</span>
                                </div>
                              )}
                              {req.userDetails.customerCode && (
                                <div>
                                  <span className="text-muted-foreground">Customer Code:</span>
                                  <span className="ml-2 text-foreground">{req.userDetails.customerCode}</span>
                                </div>
                              )}
                              {req.userDetails.contactPerson && (
                                <div>
                                  <span className="text-muted-foreground">Contact:</span>
                                  <span className="ml-2 text-foreground">{req.userDetails.contactPerson}</span>
                                </div>
                              )}
                              {req.userDetails.mobile && (
                                <div>
                                  <span className="text-muted-foreground">Mobile:</span>
                                  <span className="ml-2 text-foreground">{req.userDetails.mobile}</span>
                                </div>
                              )}
                              {req.userDetails.email && (
                                <div>
                                  <span className="text-muted-foreground">Email:</span>
                                  <span className="ml-2 text-foreground">{req.userDetails.email}</span>
                                </div>
                              )}
                            </>
                          )}

                          {/* ── Load & Appliances ── */}
                          {req.loadData && (
                            <>
                              <div className="col-span-2 border-t border-border/50 my-1" />
                              <div className="col-span-2 mb-1">
                                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Load Information</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Method:</span>
                                <span className="ml-2 text-foreground capitalize">{req.loadData.method === "calculator" ? "Load Calculator" : "Document Upload"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Max Demand:</span>
                                <span className="ml-2 text-foreground font-semibold">{req.loadData.totalKVAH.toFixed(2)} kVAH</span>
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

                          {/* ── Uploaded Documents (live) ── */}
                          {(() => {
                            const reqDocs = getDocumentsForRequest(req.id);
                            if (reqDocs.length === 0) return null;
                            return (
                              <>
                                <div className="col-span-2 border-t border-border/50 my-1" />
                                <div className="col-span-2 mb-1">
                                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Uploaded Documents</span>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                  {reqDocs.map(({ slot, doc }) => (
                                    <DocumentLink key={slot} doc={doc} variant="card" />
                                  ))}
                                </div>
                              </>
                            );
                          })()}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rejection Notice */}
                  {hasRejection && (
                    <div className="mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <p className="text-xs text-destructive font-medium mb-1">⚠ Rejection Reason:</p>
                      <p className="text-xs text-foreground/80">{req.rejectionReason}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <RefreshCw className="w-3 h-3" /> Re-submit documents
                      </span>
                    </div>
                  )}

                  {/* Expiry notice & Extension/Deactivation for temp connections */}
                  {req.expiry && req.workflowType === "power-temporary" && (
                    <div className="mt-3 space-y-2">
                      <div className="p-2 rounded-lg bg-warning/5 border border-warning/10">
                        <p className="text-xs text-warning font-medium">⚠ Temporary — Expires: {req.expiry}</p>
                      </div>

                      {req.deactivated ? (
                        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                          <p className="text-sm text-destructive font-semibold flex items-center gap-1.5">
                            <TimerOff className="w-4 h-4" /> Connection Deactivated
                          </p>
                        </div>
                      ) : req.extensionRequest?.status === "pending" ? (
                        <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                          <p className="text-sm text-accent font-medium flex items-center gap-1.5">
                            <Clock className="w-4 h-4" /> Extension request pending SPOC approval
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Requested new end date: {req.extensionRequest.newEndDate}</p>
                        </div>
                      ) : req.extensionRequest?.status === "approved" ? (
                        <div className="p-3 rounded-lg bg-success/5 border border-success/10">
                          <p className="text-sm text-success font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Extension approved — new expiry: {req.expiry}
                          </p>
                        </div>
                      ) : req.extensionRequest?.status === "rejected" ? (
                        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                          <p className="text-sm text-destructive font-medium">Extension request rejected</p>
                          {req.extensionRequest.rejectionReason && (
                            <p className="text-xs text-muted-foreground mt-1">Reason: {req.extensionRequest.rejectionReason}</p>
                          )}
                        </div>
                      ) : isCompleted ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setExtModalReqId(req.id); setExtNewDate(""); setExtReason(""); setExtPoFile(""); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Request Extension
                          </button>
                          <button
                            onClick={() => setDeactivateConfirmId(req.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                          >
                            <TimerOff className="w-3.5 h-3.5" /> Request Deactivation
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Non-temp expiry (should not happen but fallback) */}
                  {req.expiry && req.workflowType !== "power-temporary" && (
                    <div className="mt-3 p-2 rounded-lg bg-warning/5 border border-warning/10">
                      <p className="text-xs text-warning font-medium">⚠ Temporary — Expires: {req.expiry}</p>
                    </div>
                  )}

                  {/* Water Meter Recommendation */}
                  {actionRequired && currentStage.id === "meter-purchase" && req.utility === "Water" && (
                    <div className="mt-3">
                      <button
                        onClick={() => setMeterRecsOpen(meterRecsOpen === req.id ? null : req.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-info/10 text-info hover:bg-info/20 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                        {meterRecsOpen === req.id ? "Hide Meter Recommendations" : "Show Meter Recommendations"}
                      </button>
                      <AnimatePresence>
                        {meterRecsOpen === req.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2"
                          >
                            <div className="p-3 rounded-lg bg-info/5 border border-info/20 flex items-start gap-2">
                              <Droplets className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-info mb-1">P&E Recommendation – Water</p>
                                <p className="text-sm text-foreground whitespace-pre-line">{waterRecMsg}</p>
                                <p className="text-xs text-muted-foreground mt-3 whitespace-pre-line">
                                  In case of any queries contact:{"\n"}Sravan Kumar{"\n"}9000000003
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Power Meter Recommendations */}
                  {actionRequired && (currentStage.id === "customer-meter-upload" || currentStage.id === "meter-recommendation" || currentStage.id === "sd-and-meter") && req.utility === "Power" && !req.meterApproved && (
                    <div className="mt-3">
                      <button
                        onClick={() => setMeterRecsOpen(meterRecsOpen === req.id ? null : req.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-info/10 text-info hover:bg-info/20 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                        {meterRecsOpen === req.id ? "Hide Meter Options" : (req.selectedMeter ? "Change Selected Meter" : "Select a Meter")}
                      </button>
                      {req.selectedMeter && meterRecsOpen !== req.id && (
                        <p className="text-xs text-success mt-2 inline-flex items-center gap-1.5 ml-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selected: <span className="font-medium text-foreground">{req.selectedMeter.make} — {req.selectedMeter.model}</span>
                        </p>
                      )}
                      <AnimatePresence>
                        {meterRecsOpen === req.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 space-y-3"
                          >
                            <p className="text-xs text-muted-foreground">Choose one meter to procure. Calibration certificate upload will unlock after a meter is selected.</p>
                            <div className="rounded-lg border border-border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-xs font-bold w-10"></TableHead>
                                  <TableHead className="text-xs font-bold">Make of Energy Meter</TableHead>
                                  <TableHead className="text-xs font-bold">Model Number</TableHead>
                                  <TableHead className="text-xs font-bold">Connection Type</TableHead>
                                  <TableHead className="text-xs font-bold">CT's Requirement</TableHead>
                                  <TableHead className="text-xs font-bold">Remarks</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {powerRows.map((row, idx) => {
                                  const isSelected =
                                    req.selectedMeter &&
                                    req.selectedMeter.make === row.make &&
                                    req.selectedMeter.model === row.model;
                                  return (
                                    <TableRow
                                      key={idx}
                                      onClick={() => selectPowerMeter(req.id, row)}
                                      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/40"}`}
                                    >
                                      <TableCell className="text-xs">
                                        <input
                                          type="radio"
                                          name={`meter-${req.id}`}
                                          checked={!!isSelected}
                                          onChange={() => selectPowerMeter(req.id, row)}
                                          className="cursor-pointer accent-primary"
                                        />
                                      </TableCell>
                                      <TableCell className="text-xs">{row.make}</TableCell>
                                      <TableCell className="text-xs">{row.model}</TableCell>
                                      <TableCell className="text-xs">{row.conn}</TableCell>
                                      <TableCell className="text-xs">{row.ct}</TableCell>
                                      <TableCell className="text-xs">{row.remark}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                            </div>
                            {powerFooter && (
                              <p className="text-xs text-center text-muted-foreground italic mt-2">{powerFooter}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {actionRequired && (() => {
                    // For water meter-purchase, generate dynamic per-category actions
                    const dynamicActions = (currentStage.id === "meter-purchase" && req.utility === "Water" && req.waterDemand)
                      ? getWaterMeterUploadActions(req.waterDemand)
                      : currentStage.actions;
                    const requiresMeterSelection =
                      req.utility === "Power" &&
                      (currentStage.id === "customer-meter-upload" || currentStage.id === "meter-recommendation") &&
                      !req.selectedMeter;
                    return dynamicActions && dynamicActions.length > 0 ? (
                      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                        {dynamicActions.map((action) => {
                          const done = req.completedActions?.includes(action.label);
                          const blocked = requiresMeterSelection && !done;
                          return (
                            <button
                              key={action.label}
                              onClick={() => !done && !blocked && handleActionClick(req.id, action)}
                              disabled={done || blocked}
                              title={blocked ? "Select a meter from the recommendations first" : undefined}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${
                                done
                                  ? "bg-muted text-muted-foreground cursor-not-allowed line-through"
                                  : blocked
                                    ? "bg-muted/60 text-muted-foreground cursor-not-allowed"
                                    : action.type === "confirm" && action.label.includes("Deactivation")
                                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                    : "bg-accent/10 text-accent hover:bg-accent/20"
                              }`}
                            >
                              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null;
                  })()}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {activeRequestId && activeAction && (
        <WorkflowActionModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setActiveRequestId(null); setActiveAction(null); }}
          onSubmit={handleActionSubmit}
          requestId={activeRequestId}
          action={activeAction}
          onFilesUploaded={(files) => {
            Object.entries(files).forEach(([fieldName, file]) => {
              saveDocument(activeRequestId, `${activeAction.label}-${fieldName}`, file, `${activeAction.label} – ${fieldName}`);
            });
          }}
        />
      )}

      {/* Extension Request Modal */}
      <AnimatePresence>
        {extModalReqId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setExtModalReqId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-md glass-card-elevated p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-foreground">Request Extension</h3>
                  <p className="text-sm text-muted-foreground">{extModalReqId}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New End Date</label>
                  <input type="date" className="input-glass w-full" value={extNewDate} onChange={(e) => setExtNewDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Reason for Extension</label>
                  <textarea className="input-glass w-full min-h-[80px] resize-none" placeholder="Explain why extension is needed..." value={extReason} onChange={(e) => setExtReason(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Upload New PO (optional)</label>
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-muted/30">
                    {extPoFile ? (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <FileText className="w-4 h-4 text-primary" /> {extPoFile}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload amended PO</span>
                      </>
                    )}
                    <input type="file" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setExtPoFile(f.name);
                        if (extModalReqId) saveDocument(extModalReqId, "extension-po", f, "Amended PO");
                      }
                    }} />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setExtModalReqId(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => { if (extModalReqId) { requestExtension(extModalReqId, extNewDate, extReason, extPoFile || undefined); setExtModalReqId(null); } }}
                  disabled={!extNewDate || !extReason.trim()}
                  className="flex-1 gradient-bg text-primary-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivation Confirmation Modal */}
      <AnimatePresence>
        {deactivateConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setDeactivateConfirmId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative z-10 w-full max-w-sm glass-card-elevated p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <TimerOff className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Confirm Deactivation</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to deactivate this temporary connection? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeactivateConfirmId(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => { deactivateConnection(deactivateConfirmId); setDeactivateConfirmId(null); }}
                  className="flex-1 bg-destructive text-destructive-foreground px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                >
                  Deactivate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ConnectionDashboard;
