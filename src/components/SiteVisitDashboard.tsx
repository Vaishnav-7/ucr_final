import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, LogOut, MapPin, Phone, User, Building2, Zap, Droplets,
  FileText, CheckCircle2, Search, X, Mail, Calendar, Gauge, ChevronDown, ChevronUp,
  Hash, Settings,
} from "lucide-react";
import { useRequestStore, type ConnectionRequest } from "@/lib/requestStore";
import { getWorkflowStages, getCurrentStage, getWaterSiteVisitActions, getWorkflowLabel } from "@/lib/workflows";
import WorkflowActionModal, { type WorkflowAction } from "./WorkflowActionModal";

interface SiteVisitDashboardProps {
  onLogout: () => void;
}

type TabFilter = "pending" | "completed";

const SiteVisitDashboard = ({ onLogout }: SiteVisitDashboardProps) => {
  const { requests, advanceStage, markActionCompleted } = useRequestStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<TabFilter>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pending: requests at site-visit-form stage
  const siteVisitRequests = requests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    const currentStage = getCurrentStage(r.workflowType, r.stageIndex);
    return currentStage.id === "site-visit-form" && r.stageIndex < stages.length - 1;
  });

  // Completed: activated requests
  const completedRequests = requests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    return r.stageIndex >= stages.length - 1;
  });

  const q = searchQuery.trim().toLowerCase();
  const activeList = tab === "pending" ? siteVisitRequests : completedRequests;
  const filtered = q ? activeList.filter((r) => matchSearch(r, q)) : activeList;

  const handleOpenForm = (req: ConnectionRequest) => {
    const currentStage = getCurrentStage(req.workflowType, req.stageIndex);
    let action = currentStage.actions?.[0];
    if (req.utility === "Water" && req.waterDemand) {
      action = getWaterSiteVisitActions(req.waterDemand);
    }
    if (!action) return;
    setActiveRequestId(req.id);
    setActiveAction(action);
    setModalOpen(true);
  };

  const handleActionSubmit = () => {
    if (!activeRequestId) return;
    markActionCompleted(activeRequestId, []);
    advanceStage(activeRequestId);
    setModalOpen(false);
    setActiveRequestId(null);
    setActiveAction(null);
  };

  const renderDetailRow = (icon: React.ReactNode, label: string, value: string | undefined, colSpan?: boolean) => {
    if (!value) return null;
    return (
      <div className={`flex items-start gap-2 ${colSpan ? "sm:col-span-2" : ""}`}>
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
      </div>
    );
  };

  const renderRequestCard = (req: ConnectionRequest, i: number, showFormButton: boolean) => {
    const isExpanded = expandedId === req.id;
    return (
      <motion.div
        key={req.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
        className={`p-5 rounded-xl border transition-all ${
          showFormButton ? "border-border hover:border-primary/20" : "border-border/60 bg-muted/5"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              req.utility === "Power" ? "bg-primary/10" : "bg-info/10"
            }`}>
              {req.utility === "Power" ? <Zap className="w-5 h-5 text-primary" /> : <Droplets className="w-5 h-5 text-info" />}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{req.id}</h3>
              <p className="text-xs text-muted-foreground">{getWorkflowLabel(req.workflowType)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showFormButton && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 text-success">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            )}
            <button
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Summary row (always visible) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate text-foreground">{req.userDetails?.customerName || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            <span className="text-foreground">{req.userDetails?.mobile || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate text-foreground">{req.address}</span>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-muted/30"
          >
            {renderDetailRow(<Building2 className="w-4 h-4 text-muted-foreground" />, "Customer Name", req.userDetails?.customerName)}
            {renderDetailRow(<Hash className="w-4 h-4 text-muted-foreground" />, "Customer Code", req.userDetails?.customerCode)}
            {renderDetailRow(<User className="w-4 h-4 text-muted-foreground" />, "Contact Person", req.userDetails?.contactPerson)}
            {renderDetailRow(<Phone className="w-4 h-4 text-muted-foreground" />, "Mobile", req.userDetails?.mobile)}
            {renderDetailRow(<Mail className="w-4 h-4 text-muted-foreground" />, "Email", req.userDetails?.email)}
            {renderDetailRow(<MapPin className="w-4 h-4 text-muted-foreground" />, "Address", req.address, true)}
            {renderDetailRow(<FileText className="w-4 h-4 text-muted-foreground" />, "Space / Address ID", req.spaceId || req.addressId)}
            {renderDetailRow(<Calendar className="w-4 h-4 text-muted-foreground" />, "Scheduled Site Visit", req.siteVisitDate)}
            {renderDetailRow(<Calendar className="w-4 h-4 text-muted-foreground" />, "Request Date", req.date)}

            {/* Load details (Power) */}
            {req.loadData && (
              <>
                {renderDetailRow(<Gauge className="w-4 h-4 text-muted-foreground" />, "Max Demand", `${req.loadData.totalKVA} kVA`)}
                {renderDetailRow(<Gauge className="w-4 h-4 text-muted-foreground" />, "Energy (kVAH)", `${req.loadData.totalKVAH} kVAH`)}
                {req.loadData.method && renderDetailRow(<FileText className="w-4 h-4 text-muted-foreground" />, "Load Method", req.loadData.method === "calculator" ? "Calculator" : "Document Upload")}
              </>
            )}

            {/* Selected meter (Power) */}
            {req.selectedMeter && (
              <>
                {renderDetailRow(<Settings className="w-4 h-4 text-muted-foreground" />, "Selected Meter Type", req.selectedMeter.meterType)}
                {renderDetailRow(<Settings className="w-4 h-4 text-muted-foreground" />, "Meter Class", req.selectedMeter.meterClass)}
                {renderDetailRow(<Settings className="w-4 h-4 text-muted-foreground" />, "CT Ratio", req.selectedMeter.ctRatio)}
                {renderDetailRow(<Settings className="w-4 h-4 text-muted-foreground" />, "Load Range", req.selectedMeter.loadRange)}
              </>
            )}

            {/* Water demand */}
            {req.waterDemand && (
              <>
                {renderDetailRow(<Droplets className="w-4 h-4 text-muted-foreground" />, "Total Water Demand", `${req.waterDemand.totalKL} KL/day`)}
                {req.waterDemand.domesticKL > 0 && renderDetailRow(<Droplets className="w-4 h-4 text-muted-foreground" />, "Domestic", `${req.waterDemand.domesticKL} KL/day`)}
                {req.waterDemand.flushingKL > 0 && renderDetailRow(<Droplets className="w-4 h-4 text-muted-foreground" />, "Flushing", `${req.waterDemand.flushingKL} KL/day`)}
                {req.waterDemand.roKL > 0 && renderDetailRow(<Droplets className="w-4 h-4 text-muted-foreground" />, "RO", `${req.waterDemand.roKL} KL/day`)}
              </>
            )}

            {/* SD info */}
            {req.sdDecision && renderDetailRow(<FileText className="w-4 h-4 text-muted-foreground" />, "SD Decision", req.sdDecision === "collected" ? "Collected" : req.sdDecision === "waived" ? "Waived" : "Pending")}
            {req.sdAmount && renderDetailRow(<FileText className="w-4 h-4 text-muted-foreground" />, "SD Amount", `₹${req.sdAmount}`)}

            {/* Expiry (temp) */}
            {req.expiry && renderDetailRow(<Calendar className="w-4 h-4 text-muted-foreground" />, "Connection Expiry", req.expiry)}
          </motion.div>
        )}

        {/* Fill form button */}
        {showFormButton && (
          <button
            onClick={() => handleOpenForm(req)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Fill Site Visit Form
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Site Visit Forms</h1>
              <p className="text-sm text-muted-foreground">Fill site visit forms for assigned requests</p>
            </div>
          </div>
          <button onClick={onLogout} className="btn-secondary flex items-center gap-2 text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request ID, customer name, mobile, address…"
            className="input-glass w-full pl-10 pr-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl w-fit">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "pending" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Pending ({siteVisitRequests.length})
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "completed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Completed ({completedRequests.length})
          </button>
        </div>

        {/* List */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold font-display text-foreground mb-4">
            {tab === "pending" ? "Pending Site Visit Forms" : "Completed Requests"}
          </h2>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">
                {tab === "pending" ? "No pending site visit forms." : "No completed requests."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((req, i) => renderRequestCard(req, i, tab === "pending"))}
            </div>
          )}
        </div>

        {/* Action modal */}
        {activeAction && (
          <WorkflowActionModal
            open={modalOpen}
            onClose={() => { setModalOpen(false); setActiveRequestId(null); setActiveAction(null); }}
            onSubmit={handleActionSubmit}
            requestId={activeRequestId || ""}
            action={activeAction}
          />
        )}
      </motion.div>
    </div>
  );
};

function matchSearch(r: ConnectionRequest, q: string): boolean {
  const ud = r.userDetails;
  return [r.id, r.address, r.addressId, ud?.customerName, ud?.customerCode, ud?.contactPerson, ud?.mobile, ud?.email]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

export default SiteVisitDashboard;
