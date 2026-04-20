import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calculator, Upload, Plus, Minus, Zap, Trash2, Send } from "lucide-react";

interface LoadCalculatorStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
}

const DEFAULT_APPLIANCES = [
  { name: "Fan", kw: 0.075, icon: "🌀" },
  { name: "LED Light", kw: 0.015, icon: "💡" },
  { name: "AC (1.5 Ton)", kw: 1.5, icon: "❄️" },
  { name: "Computer", kw: 0.2, icon: "💻" },
  { name: "Printer", kw: 0.1, icon: "🖨️" },
  { name: "Water Pump", kw: 1.0, icon: "💧" },
  { name: "Heater", kw: 2.0, icon: "🔥" },
  { name: "Refrigerator", kw: 0.15, icon: "🧊" },
];

interface CustomAppliance {
  id: string;
  name: string;
  kw: number;
  qty: number;
  hours: number;
}

const LoadCalculatorStep = ({ onNext, onBack }: LoadCalculatorStepProps) => {
  const [method, setMethod] = useState<"calculator" | "upload">("calculator");
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_APPLIANCES.map((a) => [a.name, 0]))
  );
  const [kwValues, setKwValues] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_APPLIANCES.map((a) => [a.name, a.kw]))
  );
  const [hoursValues, setHoursValues] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_APPLIANCES.map((a) => [a.name, 0]))
  );
  const [docUploaded, setDocUploaded] = useState(false);
  const [loadDocFile, setLoadDocFile] = useState<File | null>(null);
  const [manualKVA, setManualKVA] = useState("");
  const [manualHours, setManualHours] = useState("");

  // Custom appliances
  const [customAppliances, setCustomAppliances] = useState<CustomAppliance[]>([]);
  const [newName, setNewName] = useState("");
  const [newKW, setNewKW] = useState("");

  const updateQty = (name: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) + delta),
    }));
  };

  const updateKw = (name: string, value: string) => {
    const num = parseFloat(value);
    setKwValues((prev) => ({ ...prev, [name]: isNaN(num) ? 0 : num }));
  };

  const updateHours = (name: string, value: string) => {
    const num = parseFloat(value);
    setHoursValues((prev) => ({ ...prev, [name]: isNaN(num) ? 0 : num }));
  };

  const addCustomAppliance = () => {
    const kw = parseFloat(newKW);
    if (!newName.trim() || isNaN(kw) || kw <= 0) return;
    setCustomAppliances((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newName.trim(), kw, qty: 1, hours: 0 },
    ]);
    setNewName("");
    setNewKW("");
  };

  const updateCustomQty = (id: string, delta: number) => {
    setCustomAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, qty: Math.max(0, a.qty + delta) } : a))
    );
  };

  const updateCustomKw = (id: string, value: string) => {
    const num = parseFloat(value);
    setCustomAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, kw: isNaN(num) ? 0 : num } : a))
    );
  };

  const updateCustomHours = (id: string, value: string) => {
    const num = parseFloat(value);
    setCustomAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, hours: isNaN(num) ? 0 : num } : a))
    );
  };

  const removeCustom = (id: string) => {
    setCustomAppliances((prev) => prev.filter((a) => a.id !== id));
  };

  const customKW = customAppliances.reduce((sum, a) => sum + a.kw * a.qty, 0);
  const calcKW = DEFAULT_APPLIANCES.reduce(
    (sum, a) => sum + (kwValues[a.name] || 0) * (quantities[a.name] || 0),
    0
  ) + customKW;
  const calcKVA = calcKW / 0.8;
  const calcKVAH = DEFAULT_APPLIANCES.reduce(
    (sum, a) => sum + ((kwValues[a.name] || 0) * (quantities[a.name] || 0) * (hoursValues[a.name] || 0)) / 0.8,
    0
  ) + customAppliances.reduce((sum, a) => sum + (a.kw * a.qty * a.hours) / 0.8, 0);

  // Validation: any appliance with qty > 0 must have hours > 0
  const missingHoursDefault = DEFAULT_APPLIANCES.filter(
    (a) => (quantities[a.name] || 0) > 0 && !(hoursValues[a.name] > 0)
  ).map((a) => a.name);
  const missingHoursCustom = customAppliances.filter((a) => a.qty > 0 && !(a.hours > 0)).map((a) => a.name);
  const missingHours = [...missingHoursDefault, ...missingHoursCustom];
  const hasHoursError = method === "calculator" && missingHours.length > 0;

  const displayKVA = method === "upload" && manualKVA ? parseFloat(manualKVA) || 0 : calcKVA;
  const displayKVAH =
    method === "upload"
      ? (parseFloat(manualKVA) || 0) * (parseFloat(manualHours) || 0)
      : calcKVAH;
  const uploadHoursMissing = method === "upload" && !!manualKVA && !(parseFloat(manualHours) > 0);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display text-foreground">Load Requirements</h2>
        <p className="text-muted-foreground mt-1">Calculate or specify your power load requirements</p>
      </div>

      <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl max-w-md">
        <button onClick={() => setMethod("calculator")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${method === "calculator" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Calculator className="w-4 h-4" /> Load Calculator
        </button>
        <button onClick={() => setMethod("upload")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${method === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {method === "calculator" ? (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Appliance Library</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DEFAULT_APPLIANCES.map((appliance) => (
                <div
                  key={appliance.name}
                  className={`p-4 rounded-xl border transition-all ${
                    quantities[appliance.name] > 0 ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{appliance.icon}</span>
                      <h4 className="font-medium text-foreground text-sm">{appliance.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(appliance.name, -1)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Minus className="w-3 h-3 text-foreground" />
                      </button>
                      <span className="w-8 text-center font-semibold text-foreground">{quantities[appliance.name]}</span>
                      <button onClick={() => updateQty(appliance.name, 1)} className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
                        <Plus className="w-3 h-3 text-primary-foreground" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">kW/unit:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={kwValues[appliance.name]}
                        onChange={(e) => updateKw(appliance.name, e.target.value)}
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">Hours/day:</label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={hoursValues[appliance.name]}
                        onChange={(e) => updateHours(appliance.name, e.target.value)}
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Appliances */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Other Appliances</h3>
            <p className="text-sm text-muted-foreground mb-4">Add custom appliances not listed above</p>

            {/* List of added custom appliances */}
            {customAppliances.length > 0 && (
              <div className="space-y-3 mb-4">
                {customAppliances.map((appliance) => (
                  <div
                    key={appliance.id}
                    className={`p-4 rounded-xl border transition-all ${
                      appliance.qty > 0 ? "border-primary/30 bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <h4 className="font-medium text-foreground text-sm">{appliance.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCustomQty(appliance.id, -1)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                          <Minus className="w-3 h-3 text-foreground" />
                        </button>
                        <span className="w-8 text-center font-semibold text-foreground">{appliance.qty}</span>
                        <button onClick={() => updateCustomQty(appliance.id, 1)} className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
                          <Plus className="w-3 h-3 text-primary-foreground" />
                        </button>
                        <button onClick={() => removeCustom(appliance.id)} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors ml-1">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">kW/unit:</label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={appliance.kw}
                          onChange={(e) => updateCustomKw(appliance.id, e.target.value)}
                          className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Hours/day:</label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={appliance.hours}
                          onChange={(e) => updateCustomHours(appliance.id, e.target.value)}
                          className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new custom appliance */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1.5">Appliance Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Industrial Motor"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium text-foreground mb-1.5">kW</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newKW}
                  onChange={(e) => setNewKW(e.target.value)}
                  placeholder="e.g. 5.0"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <button
                onClick={addCustomAppliance}
                disabled={!newName.trim() || !newKW || parseFloat(newKW) <= 0}
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {/* Summary */}
          <motion.div
            initial={false}
            animate={{ scale: displayKVA > 0 ? 1 : 0.98, opacity: displayKVA > 0 ? 1 : 0.6 }}
            className="glass-card-elevated p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Load Summary</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-xl bg-muted">
                <p className="text-sm text-muted-foreground">Max Demand</p>
                <p className="text-3xl font-bold font-display text-foreground">{displayKVA.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">kVA</span></p>
              </div>
            </div>
            {hasHoursError && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">
                  Please enter Hours/day for: {missingHours.join(", ")}
                </p>
              </div>
            )}
            {displayKVA > 0 && method === "calculator" && !hasHoursError && (
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  Breakdown: {DEFAULT_APPLIANCES.filter((a) => quantities[a.name] > 0).map((a) => `${quantities[a.name]}× ${a.name} (${(((kwValues[a.name] || 0) * quantities[a.name]) / 0.8).toFixed(2)} kVA)`).join(" • ")}
                  {customAppliances.filter((a) => a.qty > 0).map((a) => ` • ${a.qty}× ${a.name} (${((a.kw * a.qty) / 0.8).toFixed(2)} kVA)`).join("")}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-8">
            <label
              className={`w-full p-12 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer block ${
                docUploaded ? "border-success bg-success/5" : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${docUploaded ? "text-success" : "text-muted-foreground"}`} />
              <h4 className="font-semibold text-foreground text-lg">{docUploaded ? "Document Uploaded" : "Upload Load Document"}</h4>
              <p className="text-sm text-muted-foreground mt-2">
                {loadDocFile ? loadDocFile.name : "PDF, DOC, or XLS with maximum demand details"}
              </p>
              <input
                type="file"
                className="hidden"
                accept="application/pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setLoadDocFile(f);
                    setDocUploaded(true);
                  }
                }}
              />
            </label>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Manual Load Entry</h3>
            <p className="text-sm text-muted-foreground mb-4">Enter load values manually if not included in your document</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Maximum Demand (kVA)</label>
                <input type="number" min="0" step="0.01" placeholder="e.g. 18" value={manualKVA} onChange={(e) => setManualKVA(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Average Hours/day</label>
                <input type="number" min="0" max="24" step="0.5" placeholder="e.g. 8" value={manualHours} onChange={(e) => setManualHours(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                {uploadHoursMissing && (
                  <p className="text-xs text-destructive mt-1">Hours/day is required to compute SD.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 mt-8">
        <button onClick={onBack} className="btn-secondary flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" /> Back</button>
        <button
          onClick={() => onNext({ method, quantities, kwValues, hoursValues, totalKVA: displayKVA, totalKVAH: displayKVAH, docUploaded, customAppliances, loadDocFile })}
          disabled={hasHoursError || uploadHoursMissing}
          className="btn-accent flex items-center justify-center gap-2 text-lg px-8 py-4 sm:w-auto w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" /> Submit Request
        </button>
      </div>
    </motion.div>
  );
};

export default LoadCalculatorStep;
