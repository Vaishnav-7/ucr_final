import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Phone, Building2, User, Mail, ArrowRight, Zap, Droplets,
  Search, Plus, Upload, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";
import { registerUser } from "@/lib/userRegistry";
import { submitCcRequest, getCcRequestByMobile, type CcRequest } from "@/lib/ccRequestStore";
import { saveDocument } from "@/lib/documentStore";

// Hardcoded mobile-to-role mapping
const MOBILE_ROLE_MAP: Record<string, UserRole> = {
  "9000000001": "user",
  "9000000002": "spoc",   // Aero SPOC
  "9000000003": "finance",
  "9000000004": "pne",
  "9000000005": "spoc",   // Non-Aero SPOC
  "9000000006": "site-visit",
};

// SPOC mobile → department mapping (used to filter their dashboard)
import type { Department } from "@/lib/customerStore";
export const SPOC_DEPARTMENT_MAP: Record<string, Department> = {
  "9000000002": "aero",
  "9000000005": "non-aero",
};

interface LoginStepProps {
  onNext: (data: any) => void;
}

const LoginStep = ({ onNext }: LoginStepProps) => {
  const [isSignup, setIsSignup] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Signup separate OTPs
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);

  // Signup fields
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");

  // Customer code (signup only)
  const [hasCode, setHasCode] = useState<boolean | null>(null);
  const [existingCode, setExistingCode] = useState("");
  const [customerForm, setCustomerForm] = useState({
    customerName: "", contactPersonName: "", mobile: "", emailId: "",
    gstin: "", pan: "", tan: "",
    houseNumber: "", streetName: "", city: "", state: "", pinCode: "",
  });
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({
    gstCertificate: false, panCard: false, tanNumber: false,
  });
  const [docFiles, setDocFiles] = useState<Record<string, File>>({});
  const [docError, setDocError] = useState(false);

  // CC request tracking
  const [ccSubmitted, setCcSubmitted] = useState(false);
  const [ccRequest, setCcRequest] = useState<CcRequest | null>(null);

  const handleSendMobileOtp = () => {
    if (mobile.length >= 10) {
      setOtpSent(true);
      // Check for existing CC request on this mobile (for returning users)
      const existing = getCcRequestByMobile(mobile);
      if (existing) {
        setCcRequest(existing);
        setCcSubmitted(true);
        if (existing.type === "verify") {
          setHasCode(true);
          setExistingCode(existing.existingCode || "");
        } else {
          setHasCode(false);
          if (existing.customerForm) {
            setCustomerForm(existing.customerForm as any);
          }
        }
      }
    }
  };

  const handleSendEmailOtp = () => {
    if (email && email.includes("@")) {
      setEmailOtpSent(true);
    }
  };

  const handleVerifyMobileOtp = () => {
    if (otp.length >= 4) {
      setMobileOtpVerified(true);
    }
  };

  const handleVerifyEmailOtp = () => {
    if (emailOtp.length >= 4) {
      setEmailOtpVerified(true);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocFile = (slot: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setDocFiles((prev) => ({ ...prev, [slot]: f }));
    setUploadedDocs((prev) => ({ ...prev, [slot]: true }));
    setDocError(false);
  };

  // Auto-populate customer code form from signup details
  useEffect(() => {
    if (hasCode === false && !ccSubmitted) {
      setCustomerForm((prev) => ({
        ...prev,
        customerName: prev.customerName || companyName,
        contactPersonName: prev.contactPersonName || contactPerson,
        mobile: prev.mobile || mobile,
        emailId: prev.emailId || email,
      }));
    }
  }, [hasCode, companyName, contactPerson, mobile, email, ccSubmitted]);

  // Refresh CC request status on re-render
  useEffect(() => {
    if (ccSubmitted && mobile) {
      const interval = setInterval(() => {
        const latest = getCcRequestByMobile(mobile);
        if (latest) setCcRequest(latest);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [ccSubmitted, mobile]);

  const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
  const detectedRole = MOBILE_ROLE_MAP[cleanMobile] || "user";

  const allDocsUploaded = uploadedDocs.gstCertificate && uploadedDocs.panCard && uploadedDocs.tanNumber;

  const handleSubmitCcRequest = () => {
    if (hasCode === true && existingCode) {
      // Submit verification request to finance
      submitCcRequest({
        type: "verify",
        mobile,
        existingCode,
        companyName,
        contactPerson,
        email,
      });
      setCcSubmitted(true);
      const req = getCcRequestByMobile(mobile);
      if (req) setCcRequest(req);
    } else if (hasCode === false) {
      if (!allDocsUploaded) {
        setDocError(true);
        return;
      }
      setDocError(false);
      // Submit creation request to finance
      const ccId = submitCcRequest({
        type: "create",
        mobile,
        customerForm,
        uploadedDocs,
        companyName: companyName || customerForm.customerName,
        contactPerson: contactPerson || customerForm.contactPersonName,
        email: email || customerForm.emailId,
      });
      // Persist actual file objects against the CC request ID so finance can view/download them.
      const docLabels: Record<string, string> = {
        gstCertificate: "GST Certificate",
        panCard: "PAN Card",
        tanNumber: "TAN Document",
      };
      Object.entries(docFiles).forEach(([slot, file]) => {
        saveDocument(ccId, slot, file, docLabels[slot] || slot);
      });
      setCcSubmitted(true);
      const req = getCcRequestByMobile(mobile);
      if (req) setCcRequest(req);
    }
  };

  const handleSubmit = () => {
    // For signup: must have approved CC request
    if (isSignup) {
      if (!ccRequest || ccRequest.status !== "approved") return;

      const code = ccRequest.approvedCode;

      const loginPayload = {
        mobile,
        role: detectedRole,
        isSignup,
        companyName: isSignup ? companyName : undefined,
        contactPerson: isSignup ? contactPerson : undefined,
        email: isSignup ? email : undefined,
        customerCode: code,
        customerForm: hasCode === false ? customerForm : undefined,
      };

      registerUser({
        mobile,
        companyName,
        contactPerson,
        email,
        customerCode: code,
        customerForm: hasCode === false ? customerForm : undefined,
      });

      onNext(loginPayload);
      return;
    }

    // Login flow: if a CC request exists for this mobile and is not approved,
    // block login and show status instead.
    const existing = getCcRequestByMobile(mobile);
    if (existing && existing.status !== "approved") {
      setCcRequest(existing);
      setCcSubmitted(true);
      return;
    }

    const loginPayload = {
      mobile,
      role: detectedRole,
      isSignup: false,
    };
    onNext(loginPayload);
  };

  const ccApproved = ccRequest?.status === "approved";
  const ccPending = ccRequest?.status === "pending";
  const ccRejected = ccRequest?.status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="w-12 h-12 rounded-2xl gradient-accent-bg flex items-center justify-center">
              <Droplets className="w-6 h-6 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground mb-2">
            Utility Connection Request Portal
          </h1>
          <p className="text-muted-foreground">
            {isSignup ? "Create your account to get started" : "Welcome back! Sign in to continue"}
          </p>
        </div>

        <div className="glass-card-elevated p-8">
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {/* === SIGNUP FLOW === */}
            {isSignup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Company Name <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter company name" className="input-glass w-full pl-10" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Person <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Full name" className="input-glass w-full pl-10" />
                  </div>
                </div>

                {/* Email with OTP */}
                {!emailOtpVerified ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Email ID <span className="text-destructive">*</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" className="input-glass w-full pl-10" disabled={emailOtpSent} />
                      </div>
                    </div>
                    {!emailOtpSent ? (
                      <button
                        onClick={handleSendEmailOtp}
                        disabled={!email || !email.includes("@")}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        Send Email OTP
                        <Mail className="w-4 h-4" />
                      </button>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Email OTP</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={emailOtp}
                            onChange={(e) => setEmailOtp(e.target.value)}
                            placeholder="Enter OTP"
                            className="input-glass flex-1 text-center text-lg tracking-[0.5em]"
                            maxLength={6}
                          />
                          <button
                            onClick={handleVerifyEmailOtp}
                            disabled={emailOtp.length < 4}
                            className="btn-primary text-sm px-4 disabled:opacity-50"
                          >
                            Verify
                          </button>
                        </div>
                        
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/30">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-sm text-foreground">Email verified: {email}</span>
                  </div>
                )}

                {/* Mobile with OTP (signup) */}
                {!mobileOtpVerified ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Mobile Number <span className="text-destructive">*</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          className="input-glass w-full pl-10"
                          maxLength={15}
                          disabled={otpSent}
                        />
                      </div>
                    </div>
                    {!otpSent ? (
                      <button
                        onClick={handleSendMobileOtp}
                        disabled={mobile.length < 10}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        Send Mobile OTP
                        <Phone className="w-4 h-4" />
                      </button>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Mobile OTP</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Enter OTP"
                            className="input-glass flex-1 text-center text-lg tracking-[0.5em]"
                            maxLength={6}
                          />
                          <button
                            onClick={handleVerifyMobileOtp}
                            disabled={otp.length < 4}
                            className="btn-primary text-sm px-4 disabled:opacity-50"
                          >
                            Verify
                          </button>
                        </div>
                        
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/30">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-sm text-foreground">Mobile verified: {mobile}</span>
                  </div>
                )}

                {/* Customer Code section - signup only, after both OTPs verified */}
                {emailOtpVerified && mobileOtpVerified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 pt-2 border-t border-border"
                  >
                    <h3 className="text-sm font-semibold text-foreground">Customer Identification</h3>

                    {/* CC request already approved – show success */}
                    {ccApproved && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border-2 border-success bg-success/5">
                        <div className="flex items-center gap-2 text-success mb-1">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold text-sm">Customer Code Approved</span>
                        </div>
                        <p className="text-foreground font-mono font-bold text-lg">{ccRequest?.approvedCode}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {ccRequest?.type === "verify" ? "Your code has been verified by the finance team." : "Your customer code has been created by the finance team."}
                        </p>
                      </motion.div>
                    )}

                    {/* CC request submitted – show success message */}
                    {ccSubmitted && !ccApproved && !ccRejected && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 rounded-xl border-2 border-success bg-success/5 text-center">
                        <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-foreground mb-2">Details submitted successfully</h3>
                        <p className="text-sm text-muted-foreground">
                          You will be notified once they are verified and you can proceed to login.
                        </p>
                      </motion.div>
                    )}

                    {/* CC request rejected */}
                    {ccRejected && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border-2 border-destructive bg-destructive/5">
                        <div className="flex items-center gap-2 text-destructive mb-1">
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-semibold text-sm">Request Rejected</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {ccRequest?.rejectionReason || "No reason provided"}
                        </p>
                        <button
                          onClick={() => { setCcSubmitted(false); setCcRequest(null); setHasCode(null); }}
                          className="mt-2 text-xs text-primary font-medium hover:underline"
                        >
                          Try again
                        </button>
                      </motion.div>
                    )}

                    {/* Initial choice – not yet submitted */}
                    {!ccSubmitted && hasCode === null && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">Do you have a Customer Code?</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setHasCode(true)} className="p-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
                            <Search className="w-5 h-5 text-primary mx-auto mb-1" />
                            <span className="text-xs font-medium text-foreground block">Yes, I have one</span>
                          </button>
                          <button onClick={() => setHasCode(false)} className="p-3 rounded-xl border border-border hover:border-primary/50 transition-all text-center">
                            <Plus className="w-5 h-5 text-accent mx-auto mb-1" />
                            <span className="text-xs font-medium text-foreground block">No, create new</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Verify existing code – not yet submitted */}
                    {!ccSubmitted && hasCode === true && (
                      <div>
                        <div className="flex gap-2">
                          <input type="text" value={existingCode} onChange={(e) => setExistingCode(e.target.value)} placeholder="Enter Customer Code" className="input-glass flex-1" />
                          <button onClick={handleSubmitCcRequest} className="btn-primary text-sm px-4" disabled={!existingCode}>
                            Submit
                          </button>
                        </div>
                        <button onClick={() => { setHasCode(null); setExistingCode(""); }} className="mt-2 text-xs text-primary font-medium hover:underline">
                          ← Back
                        </button>
                      </div>
                    )}

                    {/* Create new code – not yet submitted */}
                    {!ccSubmitted && hasCode === false && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <p className="text-xs text-muted-foreground">Fill in details — Finance will review and assign your Customer Code</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs font-medium text-foreground mb-1 block">Customer Name *</label><input type="text" value={customerForm.customerName} onChange={(e) => handleFieldChange("customerName", e.target.value)} className="input-glass w-full text-sm" placeholder="Company name" /></div>
                          <div><label className="text-xs font-medium text-foreground mb-1 block">Contact Person *</label><input type="text" value={customerForm.contactPersonName} onChange={(e) => handleFieldChange("contactPersonName", e.target.value)} className="input-glass w-full text-sm" placeholder="Full name" /></div>
                          <div><label className="text-xs font-medium text-foreground mb-1 block">Mobile *</label><input type="tel" value={customerForm.mobile} onChange={(e) => handleFieldChange("mobile", e.target.value)} className="input-glass w-full text-sm" /></div>
                          <div><label className="text-xs font-medium text-foreground mb-1 block">Email *</label><input type="email" value={customerForm.emailId} onChange={(e) => handleFieldChange("emailId", e.target.value)} className="input-glass w-full text-sm" /></div>
                          <div><label className="text-xs font-medium text-foreground mb-1 block">GSTIN</label><input type="text" value={customerForm.gstin} onChange={(e) => handleFieldChange("gstin", e.target.value)} className="input-glass w-full text-sm" /></div>
                          <div><label className="text-xs font-medium text-foreground mb-1 block">PAN</label><input type="text" value={customerForm.pan} onChange={(e) => handleFieldChange("pan", e.target.value)} className="input-glass w-full text-sm" /></div>
                          <div><label className="text-xs font-medium text-foreground mb-1 block">TAN</label><input type="text" value={customerForm.tan} onChange={(e) => handleFieldChange("tan", e.target.value)} className="input-glass w-full text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2"><label className="text-xs font-medium text-foreground mb-1 block">Address</label></div>
                          <div><input type="text" value={customerForm.houseNumber} onChange={(e) => handleFieldChange("houseNumber", e.target.value)} className="input-glass w-full text-sm" placeholder="House No." /></div>
                          <div><input type="text" value={customerForm.streetName} onChange={(e) => handleFieldChange("streetName", e.target.value)} className="input-glass w-full text-sm" placeholder="Street" /></div>
                          <div><input type="text" value={customerForm.city} onChange={(e) => handleFieldChange("city", e.target.value)} className="input-glass w-full text-sm" placeholder="City" /></div>
                          <div><input type="text" value={customerForm.state} onChange={(e) => handleFieldChange("state", e.target.value)} className="input-glass w-full text-sm" placeholder="State" /></div>
                          <div><input type="text" value={customerForm.pinCode} onChange={(e) => handleFieldChange("pinCode", e.target.value)} className="input-glass w-full text-sm" placeholder="PIN Code" maxLength={6} /></div>
                        </div>

                        {/* Mandatory Document Uploads */}
                        <div className="pt-3 border-t border-border">
                          <h4 className="text-xs font-semibold text-foreground mb-2">Upload Documents <span className="text-destructive">*</span></h4>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: "gstCertificate", label: "GST Certificate" },
                              { key: "panCard", label: "PAN Card" },
                              { key: "tanNumber", label: "TAN Document" },
                            ].map((doc) => {
                              const file = docFiles[doc.key];
                              return (
                                <label
                                  key={doc.key}
                                  className={`p-3 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer block ${
                                    uploadedDocs[doc.key]
                                      ? "border-success bg-success/5"
                                      : docError && !uploadedDocs[doc.key]
                                      ? "border-destructive bg-destructive/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  {uploadedDocs[doc.key] ? (
                                    <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
                                  ) : (
                                    <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                                  )}
                                  <span className="text-[10px] font-medium text-foreground block">{doc.label}</span>
                                  {file ? (
                                    <span className="text-[10px] text-success font-medium block truncate" title={file.name}>{file.name}</span>
                                  ) : (
                                    <span className="text-[10px] text-destructive font-medium">Required *</span>
                                  )}
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
                          {docError && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-destructive font-medium">
                              <AlertCircle className="w-3 h-3" />
                              All three documents are mandatory.
                            </div>
                          )}
                        </div>

                        {/* Submit + Back row */}
                        <div className="flex items-center justify-between gap-3 mt-2">
                          <button onClick={() => { setHasCode(null); }} className="text-xs text-primary font-medium hover:underline">
                            ← Back
                          </button>
                          <button
                            onClick={handleSubmitCcRequest}
                            className="btn-primary text-sm px-6"
                          >
                            Submit details
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Signup submit button - only show when CC approved */}
                {emailOtpVerified && mobileOtpVerified && ccApproved && (
                  <button
                    onClick={handleSubmit}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            )}

            {/* === LOGIN FLOW === */}
            {!isSignup && (
              <div className="space-y-4">
                {/* If CC request is pending/rejected for this mobile, show status and block login */}
                {ccSubmitted && ccRequest && ccRequest.status !== "approved" ? (
                  <>
                    {ccRequest.status === "pending" && (
                      <div className="p-6 rounded-xl border-2 border-warning bg-warning/5 text-center">
                        <Clock className="w-10 h-10 text-warning mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-foreground mb-2">Awaiting Verification</h3>
                        <p className="text-sm text-muted-foreground">
                          Your customer code request is still being verified.
                          You'll be able to log in once it's approved.
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">Mobile: {mobile}</p>
                      </div>
                    )}
                    {ccRequest.status === "rejected" && (
                      <div className="p-6 rounded-xl border-2 border-destructive bg-destructive/5 text-center">
                        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-foreground mb-2">Request Rejected</h3>
                        <p className="text-sm text-muted-foreground">
                          Reason: {ccRequest.rejectionReason || "No reason provided"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                          Please sign up again with the corrected details.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => { setCcSubmitted(false); setCcRequest(null); setOtp(""); setOtpSent(false); setMobile(""); }}
                      className="btn-secondary w-full text-sm"
                    >
                      Back to Login
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          className="input-glass w-full pl-10"
                          maxLength={15}
                        />
                      </div>
                    </div>

                    {!otpSent ? (
                      <button
                        onClick={handleSendMobileOtp}
                        disabled={mobile.length < 10}
                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        Send OTP
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Enter OTP</label>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="6-digit OTP"
                            className="input-glass w-full text-center text-lg tracking-[0.5em]"
                            maxLength={6}
                          />
                          
                        </div>

                        <button
                          onClick={handleSubmit}
                          disabled={otp.length < 4}
                          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          Verify & Login
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginStep;
