import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ArrowRight, ArrowLeft, Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface CustomerCodeStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

const CustomerCodeStep = ({ onNext, onBack }: CustomerCodeStepProps) => {
  const [hasCode, setHasCode] = useState<boolean | null>(null);
  const [existingCode, setExistingCode] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [formData, setFormData] = useState({
    customerName: "", customerCode: "", twoLetterCode: "", threeLetterCode: "",
    gstNumber: "", gstAddress: "",
    houseNumber: "", streetName: "", city: "", state: "", pinCode: "",
    contactPerson: "", designation: "", emailId: "", mobile: "", landline: "",
    billingEmails: [""],
  });
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({
    gstCertificate: false, panCard: false, tanNumber: false,
  });
  const [docFiles, setDocFiles] = useState<Record<string, File>>({});
  const [showDocError, setShowDocError] = useState(false);

  const handleVerify = () => {
    setVerificationStatus("verifying");
    setTimeout(() => setVerificationStatus("verified"), 1500);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addBillingEmail = () => {
    if (formData.billingEmails.length < 5) {
      setFormData((prev) => ({ ...prev, billingEmails: [...prev.billingEmails, ""] }));
    }
  };

  const updateBillingEmail = (index: number, value: string) => {
    setFormData((prev) => {
      const emails = [...prev.billingEmails];
      emails[index] = value;
      return { ...prev, billingEmails: emails };
    });
  };

  const handleDocFile = (slot: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setDocFiles((prev) => ({ ...prev, [slot]: f }));
    setUploadedDocs((prev) => ({ ...prev, [slot]: true }));
    setShowDocError(false);
  };

  const allDocsUploaded = uploadedDocs.gstCertificate && uploadedDocs.panCard && uploadedDocs.tanNumber;

  const handleContinue = () => {
    if (hasCode === false && !allDocsUploaded) {
      setShowDocError(true);
      return;
    }
    setShowDocError(false);
    onNext({ hasCode, existingCode, formData, uploadedDocs, docFiles });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display text-foreground">Customer Code</h2>
        <p className="text-muted-foreground mt-1">Verify or create your customer code to proceed</p>
      </div>

      {hasCode === null && (
        <div className="glass-card p-8">
          <h3 className="text-lg font-semibold text-foreground mb-6">Do you have a Customer Code?</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setHasCode(true)} className="glass-card p-6 hover:border-primary/50 transition-all cursor-pointer text-center group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground">Yes, I have one</h4>
              <p className="text-sm text-muted-foreground mt-1">Verify existing code</p>
            </button>
            <button onClick={() => setHasCode(false)} className="glass-card p-6 hover:border-primary/50 transition-all cursor-pointer text-center group">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/20 transition-colors">
                <Plus className="w-6 h-6 text-accent" />
              </div>
              <h4 className="font-semibold text-foreground">No, create new</h4>
              <p className="text-sm text-muted-foreground mt-1">Register as new customer</p>
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {hasCode === true && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Verify Customer Code</h3>
            <div className="flex gap-3">
              <input type="text" value={existingCode} onChange={(e) => setExistingCode(e.target.value)} placeholder="Enter your Customer Code" className="input-glass flex-1" />
              <button onClick={handleVerify} className="btn-primary" disabled={!existingCode}>Verify</button>
            </div>
            {verificationStatus === "verifying" && (
              <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Verifying with finance...
              </div>
            )}
            {verificationStatus === "verified" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                Customer code verified successfully!
              </motion.div>
            )}
            {verificationStatus === "failed" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Code not found. Please check and try again.
              </motion.div>
            )}
          </motion.div>
        )}

        {hasCode === false && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Company Info */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Customer Name *</label><input type="text" value={formData.customerName} onChange={(e) => handleFieldChange("customerName", e.target.value)} className="input-glass w-full" placeholder="Company name" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Customer Code</label><input type="text" value={formData.customerCode} onChange={(e) => handleFieldChange("customerCode", e.target.value)} className="input-glass w-full" placeholder="Leave blank if new" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Two Letter Code</label><input type="text" value={formData.twoLetterCode} onChange={(e) => handleFieldChange("twoLetterCode", e.target.value)} className="input-glass w-full" placeholder="e.g. AB" maxLength={2} /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Three Letter Code (Airline)</label><input type="text" value={formData.threeLetterCode} onChange={(e) => handleFieldChange("threeLetterCode", e.target.value)} className="input-glass w-full" placeholder="e.g. ABC" maxLength={3} /></div>
              </div>
            </div>

            {/* GST & Address */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">GST & Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">GST Number *</label><input type="text" value={formData.gstNumber} onChange={(e) => handleFieldChange("gstNumber", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">GST Address</label><input type="text" value={formData.gstAddress} onChange={(e) => handleFieldChange("gstAddress", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">House Number</label><input type="text" value={formData.houseNumber} onChange={(e) => handleFieldChange("houseNumber", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Street Name</label><input type="text" value={formData.streetName} onChange={(e) => handleFieldChange("streetName", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">City</label><input type="text" value={formData.city} onChange={(e) => handleFieldChange("city", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">State</label><input type="text" value={formData.state} onChange={(e) => handleFieldChange("state", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">PIN Code *</label><input type="text" value={formData.pinCode} onChange={(e) => handleFieldChange("pinCode", e.target.value)} className="input-glass w-full" maxLength={6} /></div>
              </div>
            </div>

            {/* Contact */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Contact Person *</label><input type="text" value={formData.contactPerson} onChange={(e) => handleFieldChange("contactPerson", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Designation</label><input type="text" value={formData.designation} onChange={(e) => handleFieldChange("designation", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label><input type="email" value={formData.emailId} onChange={(e) => handleFieldChange("emailId", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Mobile *</label><input type="tel" value={formData.mobile} onChange={(e) => handleFieldChange("mobile", e.target.value)} className="input-glass w-full" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Landline</label><input type="tel" value={formData.landline} onChange={(e) => handleFieldChange("landline", e.target.value)} className="input-glass w-full" /></div>
              </div>
            </div>

            {/* Billing Emails */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Billing Email IDs</h3>
                <span className="text-xs text-muted-foreground">{formData.billingEmails.length}/5</span>
              </div>
              <div className="space-y-3">
                {formData.billingEmails.map((email, i) => (
                  <input key={i} type="email" value={email} onChange={(e) => updateBillingEmail(i, e.target.value)} placeholder={`Billing email ${i + 1}`} className="input-glass w-full" />
                ))}
                {formData.billingEmails.length < 5 && (
                  <button onClick={addBillingEmail} className="text-sm text-primary font-medium flex items-center gap-1 hover:opacity-80">
                    <Plus className="w-4 h-4" /> Add email
                  </button>
                )}
              </div>
            </div>

            {/* Document Upload */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Upload Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {[
                  { key: "gstCertificate", label: "GST Certificate" },
                  { key: "panCard", label: "PAN Card" },
                  { key: "tanNumber", label: "TAN Document" },
                ].map((doc) => {
                  const file = docFiles[doc.key];
                  return (
                    <label
                      key={doc.key}
                      className={`p-4 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer block ${
                        uploadedDocs[doc.key] ? "border-success bg-success/5" : showDocError && !uploadedDocs[doc.key] ? "border-destructive bg-destructive/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {uploadedDocs[doc.key] ? (
                        <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                      ) : (
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      )}
                      <span className="text-sm font-medium text-foreground">{doc.label}</span>
                      <p className="text-xs text-destructive font-medium mt-0.5">Required *</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{file ? file.name : "Click to upload"}</p>
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*,.doc,.docx"
                        onChange={(e) => handleDocFile(doc.key, e)}
                      />
                    </label>
                  );
                })}
              </div>
              {showDocError && (
                <div className="mt-3 flex items-center gap-2 text-destructive text-sm font-medium">
                  <AlertCircle className="w-4 h-4" />
                  All three documents (GST Certificate, PAN Card, TAN Document) are mandatory.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleContinue} className="btn-primary flex items-center gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default CustomerCodeStep;
