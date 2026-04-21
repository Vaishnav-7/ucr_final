import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const utilitiesList: string[] = wizardData.utility?.selectedUtilities || [];
  const includesPower = utilitiesList.includes("power");
  const includesWater = utilitiesList.includes("water");
  const requiresTerms = includesPower || includesWater;
  const isNonMetered = wizardData.utility?.meterType === "non-metered";
  const [showTerms, setShowTerms] = useState(requiresTerms);
  const [agreed, setAgreed] = useState(false);
  const submittedRef = useRef(false);

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
        totalKVA: ld.totalKVA || 0,
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

  // Auto-submit on mount unless Power T&C must be accepted first.
  useEffect(() => {
    if (!requiresTerms && !submittedRef.current) {
      submittedRef.current = true;
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAgree = () => {
    if (!agreed || submittedRef.current) return;
    submittedRef.current = true;
    setShowTerms(false);
    handleSubmit();
  };

  return (
    <>
    <Dialog open={showTerms} onOpenChange={(open) => { if (!open && !submittedRef.current) { /* prevent dismiss */ setShowTerms(true); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Terms &amp; Conditions</DialogTitle>
          <DialogDescription>
            Please read and accept the terms below before submitting your connection request.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-2 text-sm text-foreground space-y-4">
          {includesPower && (
            <div>
              <h4 className="font-semibold mb-2">
                {isNonMetered ? "Non-Metered" : "Metered"} Power Connection
              </h4>
          {isNonMetered ? (
            <ul className="list-disc pl-5 space-y-2">
              <li>If any malpractices such as unauthorized connections or usage of high energy consuming equipment are observed, it will be considered as severe violation. Penalty shall be imposed, whichever is higher as follows:
                <ul className="list-[circle] pl-5 mt-1">
                  <li>Option 1: Impose a default Rs 1,00,000/- per incident/malpractice.</li>
                  <li>Option 2: Impose a penalty 3 times Maximum Demand.</li>
                </ul>
              </li>
              <li>ECR form must be readily available and produced on request by any GHIAL personnel. Failure to produce (not available) ECR form when requested will result in <strong>immediate termination of the connection</strong>.</li>
              <li>Before vacating the location, all the cables shall be concealed properly, and Off Boarding HOTO form to be submitted; if failed to do so, charges of corresponding work will be penalized.</li>
              <li>If any concessionaire submits a request 90 days after the request date, we will not provide the connection at that time.</li>
            </ul>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              <li>Only approved digital energy meters shall be procured.</li>
              <li>Separate ECR forms shall be submitted for different locations even if concessionaires are same.</li>
              <li>Energy Meter Calibration/Test certificate shall be submitted with ECR form.</li>
              <li>Connections shall only be provided upon submission of a duly filled application form along with a valid calibration certificate. Calibration is considered valid for five years from the date of issue. After this period, recalibration is mandatory to ensure continued compliance and accuracy.</li>
              <li>If any meter is found in damaged/not working condition, consumption charges will be imposed based on the average consumption recorded in the previous three months.</li>
              <li>If any malpractices such as tampering of meter, temporary removal, or unauthorized connections are observed, it will be considered as severe violation. Penalty shall be imposed, whichever is higher as follows:
                <ul className="list-[circle] pl-5 mt-1">
                  <li>Option 1: Impose a default Rs 1,00,000/- per incident/malpractice.</li>
                  <li>Option 2: Impose a penalty 3 times Maximum Demand.</li>
                </ul>
              </li>
              <li>In case of connection type is declared as prepaid connection, vendor has to share contact details &amp; email ID for account creation and recharges.</li>
              <li>ECR form must be readily available and produced on request by any GHIAL personnel. Failure to produce (not available) ECR form when requested will result in <strong>immediate termination of the connection</strong>.</li>
              <li>Before vacating the location, all the cables shall be concealed properly, and Off Boarding HOTO form to be submitted; if failed to do so, charges of corresponding work will be penalized.</li>
              <li>If any concessionaire submits a request 90 days after the request date, we will not provide the connection at that time.</li>
              <li>In case of non-metered connection is required, a separate non meter form shall be submitted.</li>
            </ul>
          )}
            </div>
          )}
          {includesWater && (
            <div>
              <h4 className="font-semibold mb-2">Water Connection</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Only <strong>pulse enabled (AMR Compatibility)</strong> water meters to be installed to support Automated Meter Reading.</li>
                <li>Meter to be installed by respective concessionaire/tenant at their cost &amp; risk along with isolating valve and suitable strainer as specified by the manufacturer with <strong>MAKE: ITRON, ZENNER AQUAMET, KRANTHI (For Temporary Connections)</strong>.</li>
                <li>To abide by all norms &amp; rules laid down by GHIAL and Statutory norms from time to time with respect to water connection granted to the Applicant.</li>
                <li>To allow clear and unencumbered access to the meters for the purpose of meter reading and its checking etc.</li>
                <li>The GHIAL shall not be held responsible for any interruption or diminution of supply of water.</li>
                <li>If any concessionaire exceeds the projected monthly water consumption, penalty shall be imposed at 100% of consumed quantity for the period in which deviation was observed. However, if concessionaire/tenant provides one-month prior intimation, penalty shall not be applicable.</li>
                <li>If any malpractices such as tampering of meter, temporary removal, un-authorized connections, water leakages &amp; waste-water pipeline blockages leading to pax inconvenience, affecting pax experience and any safety violations are found among concessionaires, it will be considered as severe violation. The tenant/concessionaire involved Penalty shall be imposed whichever is higher as follows:
                  <ul className="list-[circle] pl-5 mt-1">
                    <li>Option 1: Impose a default <strong>Rs 1,00,000/-</strong> per incident/malpractice.</li>
                    <li>Option 2: Impose a penalty <strong>3 times of Maximum Demand</strong>.</li>
                  </ul>
                </li>
                <li>Concessionaire before vacates the location Off Boarding HOTO form to be submitted, if failed to do so charges of security deposit will not be reimbursed.</li>
                <li>The <strong>WCR (Water Connection Request) form</strong> must be <strong>readily available</strong> and presented upon request by any <strong>GHIAL personnel</strong>. Failure to produce (Not available) the WCR form when requested will result in <strong>immediate termination of the connection</strong>.</li>
              </ol>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t">
          <Checkbox id="agree-terms" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
          <label htmlFor="agree-terms" className="text-sm cursor-pointer select-none">
            I have read and agree to the above Terms &amp; Conditions.
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={handleAgree} disabled={!agreed}>Agree &amp; Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        {showTerms
          ? "Please review and accept the Terms & Conditions to continue."
          : `Your utility connection request ${submitted ? "has been submitted" : "is being submitted"}. You'll be redirected to your dashboard shortly.`}
      </p>
    </motion.div>
    </>
  );
};

export default SubmitStep;
