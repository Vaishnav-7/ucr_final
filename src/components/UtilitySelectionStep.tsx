import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Zap, Droplets, Clock, Plug, CreditCard, Gauge, PlusCircle, Layers, ToggleLeft, Send } from "lucide-react";

interface UtilitySelectionStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

const UtilitySelectionStep = ({ onNext, onBack }: UtilitySelectionStepProps) => {
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>([]);
  // Power hierarchy: powerCategory → regular/temporary
  // If regular: meterType → metered/non-metered
  // If metered: billingType → postpaid/prepaid
  const [powerCategory, setPowerCategory] = useState<"regular" | "temporary" | null>(null);
  const [meterType, setMeterType] = useState<"metered" | "non-metered" | null>(null);
  const [billingType, setBillingType] = useState<"postpaid" | "prepaid" | null>(null);
  const [waterType, setWaterType] = useState<"existing" | "new" | null>(null);
  const [tempDates, setTempDates] = useState({ from: "", to: "" });

  const toggleUtility = (u: string) => {
    setSelectedUtilities((prev) => {
      // Single-select: clicking the same utility deselects it; clicking the other replaces.
      if (prev.includes(u)) return [];
      return [u];
    });
    // Reset all sub-selections so switching utilities starts fresh.
    setPowerCategory(null);
    setMeterType(null);
    setBillingType(null);
    setWaterType(null);
  };

  const showPower = selectedUtilities.includes("power");
  const showWater = selectedUtilities.includes("water");

  // Derive the legacy powerType for downstream compatibility
  const derivedPowerType = (() => {
    if (!powerCategory) return null;
    if (powerCategory === "temporary") return "temporary" as const;
    if (meterType === "non-metered") return "prepaid" as const;
    if (meterType === "metered" && billingType) return billingType;
    return null;
  })();

  const powerComplete =
    !showPower ||
    (powerCategory === "temporary") ||
    (powerCategory === "regular" && meterType === "non-metered") ||
    (powerCategory === "regular" && meterType === "metered" && billingType !== null);

  const canContinue =
    selectedUtilities.length > 0 &&
    powerComplete &&
    (!showWater || waterType !== null);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display text-foreground">Utility Connection Type</h2>
        <p className="text-muted-foreground mt-1">Choose what you need and the type of connection</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <button
          onClick={() => toggleUtility("power")}
          className={`glass-card p-8 text-center transition-all cursor-pointer group ${
            selectedUtilities.includes("power") ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
            selectedUtilities.includes("power") ? "gradient-bg" : "bg-primary/10 group-hover:bg-primary/20"
          }`}>
            <Zap className={`w-8 h-8 ${selectedUtilities.includes("power") ? "text-primary-foreground" : "text-primary"}`} />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground">Power</h3>
        </button>

        <button
          onClick={() => toggleUtility("water")}
          className={`glass-card p-8 text-center transition-all cursor-pointer group ${
            selectedUtilities.includes("water") ? "border-info ring-2 ring-info/20" : "hover:border-info/30"
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
            selectedUtilities.includes("water") ? "bg-info" : "bg-info/10 group-hover:bg-info/20"
          }`}>
            <Droplets className={`w-8 h-8 ${selectedUtilities.includes("water") ? "text-info-foreground" : "text-info"}`} />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground">Water</h3>
        </button>
      </div>

      {/* Power: Step 1 — Regular or Temporary */}
      {showPower && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Power Connection Type</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setPowerCategory("regular"); setMeterType(null); setBillingType(null); }}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                powerCategory === "regular" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <Layers className="w-6 h-6 text-primary mb-2" />
              <h4 className="font-semibold text-foreground">Regular</h4>
              <p className="text-xs text-muted-foreground">Permanent power connection</p>
            </button>
            <button
              onClick={() => { setPowerCategory("temporary"); setMeterType(null); setBillingType(null); }}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                powerCategory === "temporary" ? "border-warning bg-warning/5" : "border-border hover:border-warning/30"
              }`}
            >
              <Clock className="w-6 h-6 text-warning mb-2" />
              <h4 className="font-semibold text-foreground">Temporary</h4>
              <p className="text-xs text-muted-foreground">Time-limited connection</p>
            </button>
          </div>

          {/* Temporary: date fields */}
          {powerCategory === "temporary" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Start Date</label>
                <input type="date" value={tempDates.from} onChange={(e) => setTempDates({ ...tempDates, from: e.target.value })} className="input-glass w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">End Date</label>
                <input type="date" value={tempDates.to} onChange={(e) => setTempDates({ ...tempDates, to: e.target.value })} className="input-glass w-full" />
              </div>
            </motion.div>
          )}

          {/* Regular: Step 2 — Metered or Non-metered */}
          {powerCategory === "regular" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Meter Type</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setMeterType("metered"); setBillingType(null); }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    meterType === "metered" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <Gauge className="w-5 h-5 text-primary mb-1.5" />
                  <h4 className="font-semibold text-foreground text-sm">Metered</h4>
                  <p className="text-xs text-muted-foreground">With energy meter installed</p>
                  <p className="text-xs text-warning mt-1.5 font-medium">⚠ Requires energy meter purchase</p>
                </button>
                <button
                  onClick={() => { setMeterType("non-metered"); setBillingType(null); }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    meterType === "non-metered" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
                  }`}
                >
                  <ToggleLeft className="w-5 h-5 text-accent mb-1.5" />
                  <h4 className="font-semibold text-foreground text-sm">Non-Metered</h4>
                  <p className="text-xs text-muted-foreground">Flat rate / no meter</p>
                </button>
              </div>

              {/* Metered: Step 3 — Postpaid or Prepaid */}
              {meterType === "metered" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Billing Type</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setBillingType("postpaid")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        billingType === "postpaid" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Gauge className="w-5 h-5 text-primary mb-1.5" />
                      <h4 className="font-semibold text-foreground text-sm">Postpaid</h4>
                      <p className="text-xs text-muted-foreground">Billed monthly after usage</p>
                    </button>
                    <button
                      onClick={() => setBillingType("prepaid")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        billingType === "prepaid" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-accent mb-1.5" />
                      <h4 className="font-semibold text-foreground text-sm">Prepaid</h4>
                      <p className="text-xs text-muted-foreground">Recharge before usage</p>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Water Connection Type */}
      {showWater && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Water Connection Type</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setWaterType("existing")}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                waterType === "existing" ? "border-info bg-info/5" : "border-border hover:border-info/30"
              }`}
            >
              <Plug className="w-6 h-6 text-info mb-2" />
              <h4 className="font-semibold text-foreground">Existing Meter</h4>
              <p className="text-xs text-muted-foreground">Already have a water meter installed</p>
            </button>
            <button
              onClick={() => setWaterType("new")}
              className={`p-5 rounded-xl border-2 transition-all text-left ${
                waterType === "new" ? "border-info bg-info/5" : "border-border hover:border-info/30"
              }`}
            >
              <PlusCircle className="w-6 h-6 text-info mb-2" />
              <h4 className="font-semibold text-foreground">New Meter</h4>
              <p className="text-xs text-muted-foreground">Need a new water meter installed</p>
            </button>
          </div>
        </motion.div>
      )}

      {(() => {
        // When non-metered power is selected, the wizard skips load calculator and goes
        // straight to submission, so promote the CTA to a big "Submit Request" button.
        const isDirectSubmit = showPower && powerCategory === "regular" && meterType === "non-metered";
        return (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 mt-8">
            <button onClick={onBack} className="btn-secondary flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button
              onClick={() => onNext({ selectedUtilities, powerType: derivedPowerType, powerCategory, meterType, billingType, waterType, tempDates })}
              disabled={!canContinue}
              className={`flex items-center justify-center gap-2 disabled:opacity-50 ${
                isDirectSubmit
                  ? "btn-accent text-lg px-8 py-4 sm:w-auto w-full"
                  : "btn-primary"
              }`}
            >
              {isDirectSubmit ? (<><Send className="w-5 h-5" /> Submit Request</>) : (<>Continue <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </div>
        );
      })()}
    </motion.div>
  );
};

export default UtilitySelectionStep;
