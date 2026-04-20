import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { addRequest, type RequestUserDetails, type LoadData, type LoadAppliance, type WaterDemandData } from "@/lib/requestStore";
import { saveDocument } from "@/lib/documentStore";
import { resolveWorkflowType } from "@/lib/workflows";
import type { WorkflowType } from "@/lib/workflows";
import { attachCustomerToDepartment, type Department } from "@/lib/customerStore";

interface SubmitStepProps {
  wizardData: any;
  onBack: () => void;
  onSubmit: () => void;
}

const SubmitStep = ({ wizardData, onBack, onSubmit }: SubmitStepProps) => {
  const [submitted, setSubmitted] = useState(false);

  const addressId = wizardData.space?.addressId || "ADDR-0000";
  const address = wizardData.space?.address || "Not provided";
  const spaceId: string | undefined = wizardData.space?.spaceId;
  const utilities: string[] = wizardData.utility?.selectedUtilities || [];
  const powerType = wizardData.utility?.powerType || "postpaid";
  const waterType = wizardData.utility?.waterType || "existing";

  const resolvedWorkflows: { utility: string; wfType: WorkflowType }[] = [];
  for (const util of utilities) {
    if (util === "power") {
      const wfType = resolveWorkflowType("power", powerType);
      resolvedWorkflows.push({ utility: "Power", wfType });
    } else if (util === "water") {
      const wfType = resolveWorkflowType("water", waterType);
      resolvedWorkflows.push({ utility: "Water", wfType });
    }
  }

  const handleSubmit = () => {
    const loginData = wizardData.login || {};
    const userDetails: RequestUserDetails = {
      customerName: loginData.companyName || loginData.customerForm?.customerName || undefined,
      customerCode: loginData.customerCode || undefined,
      contactPerson: loginData.contactPerson || loginData.customerForm?.contactPersonName || undefined,
      mobile: loginData.mobile || undefined,
      email: loginData.email || loginData.customerForm?.emailId || undefined,
    };

    let loadData: LoadData | undefined;
    if (wizardData.load) {
      const ld = wizardData.load;
      const appliances: LoadAppliance[] = [];
      if (ld.quantities && ld.kwValues) {
        for (const [name, qty] of Object.entries(ld.quantities)) {
          if ((qty as number) > 0) {
            appliances.push({ name, kw: (ld.kwValues as Record<string, number>)[name] || 0, qty: qty as number });
          }
        }
      }
      if (ld.customAppliances) {
        for (const ca of ld.customAppliances) {
          if (ca.qty > 0) appliances.push({ name: ca.name, kw: ca.kw, qty: ca.qty });
        }
      }
      loadData = {
        method: ld.method || "calculator",
        totalKW: ld.totalKW || 0,
        totalKVAH: ld.totalKVAH || 0,
        appliances: appliances.length > 0 ? appliances : undefined,
        docUploaded: ld.docUploaded || false,
      };
    }

    let waterDemand: WaterDemandData | undefined;
    if (wizardData.waterDemand) {
      const wd = wizardData.waterDemand;
      waterDemand = { domesticKL: wd.domesticKL || 0, flushingKL: wd.flushingKL || 0, roKL: wd.roKL || 0, totalKL: wd.totalKL || 0 };
    }

    // Files uploaded earlier in the wizard.
    const spaceDocFiles: Record<string, File> = wizardData.space?.documentFiles || {};
    const loadDocFile: File | undefined = wizardData.load?.loadDocFile;
    const spaceDocLabels: Record<string, string> = {
      noc: "NOC", loi: "LOI", agreement: "Agreement", poa: "Purchase Order",
    };

    for (const rw of resolvedWorkflows) {
      const typeLabel =
        rw.wfType === "power-prepaid" ? "Prepaid" :
        rw.wfType === "power-regular" ? "Postpaid" :
        rw.wfType === "power-temporary" ? "Temporary" :
        rw.wfType === "water-existing-meter" ? "Existing Meter" :
        rw.wfType === "water-no-meter" ? "New Meter" : "Standard";

      const newId = addRequest({
        utility: rw.utility,
        type: typeLabel,
        workflowType: rw.wfType,
        address,
        addressId,
        spaceId,
        expiry: rw.wfType === "power-temporary" ? wizardData.utility?.tempDates?.to : undefined,
        userDetails,
        loadData: rw.utility === "Power" ? loadData : undefined,
        waterDemand: rw.utility === "Water" ? waterDemand : undefined,
      });

      // Persist uploaded space docs against this new request.
      Object.entries(spaceDocFiles).forEach(([slot, file]) => {
        saveDocument(newId, `space-${slot}`, file, spaceDocLabels[slot] || slot.toUpperCase());
      });
      // Persist the load document for power requests.
      if (rw.utility === "Power" && loadDocFile) {
        saveDocument(newId, "load-document", loadDocFile, "Load Document");
      }
    }

    // Attach customer to the SPOC department selected on Address & Docs step.
    const dept = wizardData.space?.department as Department | undefined;
    if (dept && userDetails.mobile) {
      attachCustomerToDepartment({
        mobile: userDetails.mobile,
        department: dept,
        customerName: userDetails.customerName,
        customerCode: userDetails.customerCode,
        contactPerson: userDetails.contactPerson,
        email: userDetails.email,
        address,
      });
    }

    setSubmitted(true);
    setTimeout(() => onSubmit(), 2000);
  };

  // Auto-submit on mount — review/summary page has been removed.
  useEffect(() => {
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-12 h-12 text-success" />
      </motion.div>
      <h2 className="text-3xl font-bold font-display text-foreground mb-2">
        {submitted ? "Request Submitted!" : "Submitting..."}
      </h2>
      <p className="text-muted-foreground max-w-md">
        Your utility connection request {submitted ? "has been submitted" : "is being submitted"}. You'll be redirected to your dashboard shortly.
      </p>
    </motion.div>
  );
};

export default SubmitStep;
