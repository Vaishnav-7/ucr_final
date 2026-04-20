import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Send } from "lucide-react";

interface WaterDemandStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

const CATEGORIES = [
  { key: "domesticKL", label: "Domestic Use", icon: "🏠", description: "Daily domestic water consumption" },
  { key: "flushingKL", label: "Flushing Use", icon: "🚿", description: "Daily flushing water consumption" },
  { key: "roKL", label: "RO Water", icon: "💧", description: "Daily RO/purified water consumption" },
];

const WaterDemandStep = ({ onNext, onBack }: WaterDemandStepProps) => {
  const [values, setValues] = useState<Record<string, string>>({
    domesticKL: "",
    flushingKL: "",
    roKL: "",
  });

  const updateValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const domesticKL = parseFloat(values.domesticKL) || 0;
  const flushingKL = parseFloat(values.flushingKL) || 0;
  const roKL = parseFloat(values.roKL) || 0;
  const totalKL = domesticKL + flushingKL + roKL;

  const canProceed = totalKL > 0;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display text-foreground">Water Demand</h2>
        <p className="text-muted-foreground mt-1">Specify your daily water demand across categories</p>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className={`glass-card p-5 border transition-all ${
              parseFloat(values[cat.key]) > 0 ? "border-info/30 bg-info/[0.03]" : "border-border"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{cat.icon}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{cat.label}</h4>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={values[cat.key]}
                  onChange={(e) => updateValue(cat.key, e.target.value)}
                  className="w-28 h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-right font-semibold text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span className="text-sm font-medium text-muted-foreground w-8">KL</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary - Individual demands only */}
      <motion.div
        initial={false}
        animate={{ scale: totalKL > 0 ? 1 : 0.98, opacity: totalKL > 0 ? 1 : 0.6 }}
        className="glass-card-elevated p-6 mt-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-info" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Demand Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="p-3 rounded-xl bg-muted">
              <p className="text-xs text-muted-foreground">{cat.label}</p>
              <p className="text-xl font-bold font-display text-foreground">
                {(parseFloat(values[cat.key]) || 0).toFixed(1)}
                <span className="text-xs font-normal text-muted-foreground ml-1">KL</span>
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 mt-8">
        <button onClick={onBack} className="btn-secondary flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => onNext({ domesticKL, flushingKL, roKL, totalKL })}
          disabled={!canProceed}
          className="btn-accent flex items-center justify-center gap-2 disabled:opacity-50 text-lg px-8 py-4 sm:w-auto w-full"
        >
          <Send className="w-5 h-5" /> Submit Request
        </button>
      </div>
    </motion.div>
  );
};

export default WaterDemandStep;
