import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { LogIn, FolderOpen, Zap, Calculator, Send } from "lucide-react";
import StepperHeader from "./StepperHeader";
import LoginStep from "./LoginStep";
import SpaceDocumentStep from "./SpaceDocumentStep";
import UtilitySelectionStep from "./UtilitySelectionStep";
import LoadCalculatorStep from "./LoadCalculatorStep";
import WaterDemandStep from "./WaterDemandStep";
import SubmitStep from "./SubmitStep";
import ConnectionDashboard from "./ConnectionDashboard";
import InternalDashboard from "./InternalDashboard";
import type { UserRole } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
import { getRegisteredUser } from "@/lib/userRegistry";

const STEPS = [
  { id: 1, title: "Login", icon: <LogIn className="w-4 h-4" /> },
  { id: 2, title: "Address & Docs", icon: <FolderOpen className="w-4 h-4" /> },
  { id: 3, title: "Utilities", icon: <Zap className="w-4 h-4" /> },
  { id: 4, title: "Demand", icon: <Calculator className="w-4 h-4" /> },
  { id: 5, title: "Submit", icon: <Send className="w-4 h-4" /> },
];

const ConnectionWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showDashboard, setShowDashboard] = useState(false);
  const [wizardData, setWizardData] = useState<Record<string, any>>({});
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const handleNext = (stepKey: string, data: any) => {
    if (stepKey === "login") {
      const role = data.role as UserRole;
      setUserRole(role);

      if (!data.isSignup) {
        const stored = getRegisteredUser(data.mobile);
        if (stored) {
          data = {
            ...data,
            companyName: stored.companyName,
            contactPerson: stored.contactPerson,
            email: stored.email,
            customerCode: stored.customerCode,
            customerForm: stored.customerForm,
          };
        }
      }

      if (role !== "user") {
        setShowDashboard(true);
        setWizardData((prev) => ({ ...prev, [stepKey]: data }));
        return;
      }

      if (!data.isSignup) {
        setShowDashboard(true);
        setWizardData((prev) => ({ ...prev, [stepKey]: data }));
        return;
      }
    }

    const updatedData = { ...wizardData, [stepKey]: data };
    setWizardData(updatedData);

    // After utility step: decide whether to show load/demand step or skip to submit
    if (stepKey === "utility") {
      const utilities = data.selectedUtilities as string[];
      const powerType = data.powerType;
      const isWaterOnly = utilities.length > 0 && utilities.every((u: string) => u === "water");
      const isPrepaidPower = utilities.includes("power") && powerType === "prepaid";

      // Prepaid power (non-metered) skips load calculator
      if (isPrepaidPower && !isWaterOnly) {
        setCurrentStep(5); // Skip to Submit
        return;
      }
      // Water-only or mixed: proceed to step 4 (demand/load)
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    // If on step 2 (Address & Docs) and user already logged in, go back to dashboard
    if (currentStep === 2) {
      setShowDashboard(true);
      return;
    }
    // If on Submit (step 5) and load/demand was skipped, go back to Utilities (step 3)
    if (currentStep === 5 && wizardData.utility) {
      const utilities = wizardData.utility.selectedUtilities as string[];
      const powerType = wizardData.utility.powerType;
      const isWaterOnly = utilities.length > 0 && utilities.every((u: string) => u === "water");
      const isPrepaidPower = utilities.includes("power") && powerType === "prepaid";
      if (isPrepaidPower && !isWaterOnly) {
        setCurrentStep(3);
        return;
      }
    }
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = () => setShowDashboard(true);

  const handleNewRequest = () => {
    setCurrentStep(2);
    setShowDashboard(false);
  };

  const handleLogout = () => {
    setCurrentStep(1);
    setShowDashboard(false);
    setWizardData({});
    setUserRole(null);
  };

  if (showDashboard && userRole && userRole !== "user") {
    const roleInfo = ROLES.find((r) => r.id === userRole)!;
    const userMobile = wizardData.login?.mobile as string | undefined;
    return <InternalDashboard role={userRole} roleLabel={roleInfo.label} userMobile={userMobile} onLogout={handleLogout} />;
  }

  if (showDashboard) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <ConnectionDashboard onNewRequest={handleNewRequest} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {currentStep > 1 && (
        <div className="glass-card mx-4 md:mx-8 mt-4 md:mt-6">
          <StepperHeader steps={STEPS} currentStep={currentStep} />
        </div>
      )}

      <div className="p-4 md:p-8">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <LoginStep key="login" onNext={(data) => handleNext("login", data)} />
          )}
          {currentStep === 2 && (
            <SpaceDocumentStep key="space" onNext={(data) => handleNext("space", data)} onBack={handleBack} />
          )}
          {currentStep === 3 && (
            <UtilitySelectionStep key="utility" onNext={(data) => handleNext("utility", data)} onBack={handleBack} />
          )}
          {currentStep === 4 && (() => {
            const utilities = wizardData.utility?.selectedUtilities as string[] | undefined;
            const isWaterOnly = utilities && utilities.length > 0 && utilities.every((u: string) => u === "water");
            if (isWaterOnly) {
              return <WaterDemandStep key="waterDemand" onNext={(data) => handleNext("waterDemand", data)} onBack={handleBack} />;
            }
            return <LoadCalculatorStep key="load" onNext={(data) => handleNext("load", data)} onBack={handleBack} />;
          })()}
          {currentStep === 5 && (
            <SubmitStep key="submit" wizardData={wizardData} onBack={handleBack} onSubmit={handleSubmit} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConnectionWizard;
