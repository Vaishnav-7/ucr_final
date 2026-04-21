import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, LogOut, MapPin, Phone, User, Building2, Zap, Droplets,
  FileText, CheckCircle2, Search, X,
} from "lucide-react";
import { useRequestStore, type ConnectionRequest } from "@/lib/requestStore";
import { getWorkflowStages, getCurrentStage, getWaterSiteVisitActions } from "@/lib/workflows";
import WorkflowActionModal, { type WorkflowAction } from "./WorkflowActionModal";

interface SiteVisitDashboardProps {
  onLogout: () => void;
}

const SiteVisitDashboard = ({ onLogout }: SiteVisitDashboardProps) => {
  const { requests, advanceStage, markActionCompleted } = useRequestStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Show requests that are at the site-visit-form stage
  const siteVisitRequests = requests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    const currentStage = getCurrentStage(r.workflowType, r.stageIndex);
    return currentStage.id === "site-visit-form" && r.stageIndex < stages.length - 1;
  });

  // Also show recently completed (activated) for reference
  const completedRequests = requests.filter((r) => {
    const stages = getWorkflowStages(r.workflowType);
    return r.stageIndex >= stages.length - 1;
  });

  const q = searchQuery.trim().toLowerCase();
  const filteredPending = q
    ? siteVisitRequests.filter((r) => matchSearch(r, q))
    : siteVisitRequests;

  const handleOpenForm = (req: ConnectionRequest) => {
    const currentStage = getCurrentStage(req.workflowType, req.stageIndex);
    // Use dynamic water form if applicable
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-card p-4">
            <p className="text-2xl font-bold font-display text-foreground">{siteVisitRequests.length}</p>
            <p className="text-xs text-muted-foreground">Pending Forms</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-2xl font-bold font-display text-foreground">{completedRequests.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Pending requests */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold font-display text-foreground mb-4">Pending Site Visit Forms</h2>

          {filteredPending.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">No pending site visit forms.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPending.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-xl border border-border hover:border-primary/20 transition-all"
                >
                  {/* Request header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        req.utility === "Power" ? "bg-primary/10" : "bg-info/10"
                      }`}>
                        {req.utility === "Power" ? <Zap className="w-5 h-5 text-primary" /> : <Droplets className="w-5 h-5 text-info" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{req.id}</h3>
                        <p className="text-xs text-muted-foreground">{req.utility} • {req.type}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{req.date}</span>
                  </div>

                  {/* Customer details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-muted/30">
                    {req.userDetails?.customerName && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Customer</p>
                          <p className="text-sm font-medium text-foreground">{req.userDetails.customerName}</p>
                        </div>
                      </div>
                    )}
                    {req.userDetails?.customerCode && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Customer Code</p>
                          <p className="text-sm font-medium text-foreground">{req.userDetails.customerCode}</p>
                        </div>
                      </div>
                    )}
                    {req.userDetails?.contactPerson && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contact Person</p>
                          <p className="text-sm font-medium text-foreground">{req.userDetails.contactPerson}</p>
                        </div>
                      </div>
                    )}
                    {req.userDetails?.mobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mobile</p>
                          <p className="text-sm font-medium text-foreground">{req.userDetails.mobile}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Address</p>
                        <p className="text-sm font-medium text-foreground">{req.address}</p>
                      </div>
                    </div>
                    {req.siteVisitDate && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <ClipboardList className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Scheduled Date</p>
                          <p className="text-sm font-medium text-foreground">{req.siteVisitDate}</p>
                        </div>
                      </div>
                    )}
                    {req.loadData && (
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Demand</p>
                          <p className="text-sm font-medium text-foreground">{req.loadData.totalKVA} kVA</p>
                        </div>
                      </div>
                    )}
                    {req.waterDemand && (
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Water Demand</p>
                          <p className="text-sm font-medium text-foreground">{req.waterDemand.totalKL} KL/day</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fill form button */}
                  <button
                    onClick={() => handleOpenForm(req)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Fill Site Visit Form
                  </button>
                </motion.div>
              ))}
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
