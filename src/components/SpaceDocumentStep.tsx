import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, MapPin, Plus, Home, ChevronDown } from "lucide-react";
import { getSavedAddresses, addSavedAddress, type SavedAddress } from "@/lib/addressStore";

interface SpaceDocumentStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

const SpaceDocumentStep = ({ onNext, onBack }: SpaceDocumentStepProps) => {
  const [address, setAddress] = useState("");
  const [addressLabel, setAddressLabel] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  // Actual File objects keyed by doc slot ("noc", "loi", ...)
  const [docFiles, setDocFiles] = useState<Record<string, File>>({});

  const savedAddresses = getSavedAddresses();

  const requiredDocs = [
    { key: "noc", label: "NOC", desc: "No Objection Certificate" },
    { key: "loi", label: "LOI", desc: "Letter of Intent" },
    { key: "agreement", label: "Agreement", desc: "Signed Agreement" },
    { key: "poa", label: "PO", desc: "Purchase Order" },
  ];

  const completedCount = Object.keys(docFiles).length;

  const handleSelectSaved = (saved: SavedAddress) => {
    setSelectedSavedId(saved.id);
    setAddress(saved.address);
    setAddressLabel(saved.label);
    setSpaceId(saved.spaceId || "");
  };

  const handleFilePick = (slot: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setDocFiles((prev) => ({ ...prev, [slot]: f }));
  };

  const handleContinue = () => {
    let addrEntry: SavedAddress;
    if (selectedSavedId) {
      addrEntry = savedAddresses.find((a) => a.id === selectedSavedId)!;
    } else {
      // Save new address
      addrEntry = addSavedAddress(address, addressLabel || undefined, spaceId || undefined);
    }
    // Boolean flags map (for backward-compat reads elsewhere) + the actual File objects.
    const documents = Object.fromEntries(
      requiredDocs.map((d) => [d.key, !!docFiles[d.key]])
    );
    onNext({
      addressId: addrEntry.id,
      address: addrEntry.address,
      addressLabel: addrEntry.label,
      spaceId: addrEntry.spaceId,
      department,
      documents,
      documentFiles: docFiles,
    });
  };

  const isValid = address.trim().length > 0 && department !== "";

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display text-foreground">Address & Documents</h2>
        <p className="text-muted-foreground mt-1">Enter your connection address and upload mandatory documents</p>
      </div>

      {/* Document Checklist */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Upload Any Document</h3>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full gradient-bg rounded-full transition-all" style={{ width: `${(completedCount / 4) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{completedCount}/4</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requiredDocs.map((doc) => {
            const file = docFiles[doc.key];
            return (
              <label
                key={doc.key}
                className={`p-5 rounded-xl border-2 border-dashed transition-all text-left cursor-pointer block ${
                  file ? "border-success bg-success/5" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {file ? (
                    <CheckCircle2 className="w-6 h-6 text-success mt-0.5" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">{doc.label}</h4>
                    <p className="text-sm text-muted-foreground">{doc.desc}</p>
                    <p className="text-xs mt-1 font-medium truncate">
                      {file ? `✓ ${file.name}` : "Click to upload"}
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/*,.doc,.docx"
                  onChange={(e) => handleFilePick(doc.key, e)}
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Department Selection */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Department</h3>
        <div className="relative">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="input-glass w-full appearance-none pr-10"
          >
            <option value="">— Select Department —</option>
            {DEPARTMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Address Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> Connection Address
        </h3>

        {/* Saved Address Dropdown */}
        <div className="mb-5">
          <label className="text-sm font-medium text-foreground mb-1.5 block">Select Saved Address</label>
          <div className="relative">
            <select
              value={selectedSavedId || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSelectedSavedId(null);
                  setAddress("");
                  setAddressLabel("");
                  setSpaceId("");
                } else if (val === "__new__") {
                  setSelectedSavedId(null);
                  setAddress("");
                  setAddressLabel("");
                  setSpaceId("");
                } else {
                  const saved = savedAddresses.find((a) => a.id === val);
                  if (saved) handleSelectSaved(saved);
                }
              }}
              className="input-glass w-full appearance-none pr-10"
            >
              {savedAddresses.length === 0 ? (
                <option value="">None — no saved addresses</option>
              ) : (
                <>
                  <option value="">— Select an address —</option>
                  {savedAddresses.map((saved) => (
                    <option key={saved.id} value={saved.id}>
                      {saved.label} ({saved.id}) — {saved.address.length > 50 ? saved.address.slice(0, 50) + "…" : saved.address}
                    </option>
                  ))}
                </>
              )}
              <option value="__new__">＋ Add new address</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Selected Address Preview */}
        {selectedSavedId && (
          <div className="mb-5 p-4 rounded-xl border-2 border-primary bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                <Home className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{addressLabel}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedSavedId}</span>
                  {spaceId && (
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">Space: {spaceId}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{address}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            </div>
          </div>
        )}

        {/* New Address Input */}
        {!selectedSavedId && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Address Label (optional)</label>
              <input
                type="text"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                placeholder="e.g. Head Office, Warehouse B, Shop 42"
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Full Address *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter the complete address for the connection..."
                className="input-glass w-full min-h-[100px] resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Space ID (optional)</label>
              <input
                type="text"
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                placeholder="e.g. SPC-2041, BAY-17"
                className="input-glass w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">If your premises has an internal Space ID, enter it here. It will be saved with the address.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleContinue} disabled={!isValid} className="btn-primary flex items-center gap-2 disabled:opacity-50">Continue <ArrowRight className="w-4 h-4" /></button>
      </div>
    </motion.div>
  );
};

export default SpaceDocumentStep;
