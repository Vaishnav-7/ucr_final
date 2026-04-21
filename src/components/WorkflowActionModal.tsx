import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import React, { useState } from "react";

export interface WorkflowActionField {
  name: string;
  label: string;
  type: "file" | "text" | "textarea" | "date" | "number" | "select";
  options?: string[];
  autoValue?: string;
  showWhen?: { field: string; value: string };
}

export interface WorkflowAction {
  label: string;
  type: "upload" | "confirm" | "choice";
  fields?: WorkflowActionField[];
}

interface WorkflowActionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  requestId: string;
  action: WorkflowAction;
  /** Called with each uploaded File keyed by field name, before onSubmit fires. */
  onFilesUploaded?: (files: Record<string, File>) => void;
}

const WorkflowActionModal = ({ open, onClose, onSubmit, requestId, action, onFilesUploaded }: WorkflowActionModalProps) => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileObjects, setFileObjects] = useState<Record<string, File>>({});
  const [submitted, setSubmitted] = useState(false);
  const [textValues, setTextValues] = useState<Record<string, string>>({});

  const handleFileChange = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFiles((prev) => ({ ...prev, [fieldName]: file.name }));
      setFileObjects((prev) => ({ ...prev, [fieldName]: file }));
    }
  };

  const handleSubmit = () => {
    if (onFilesUploaded && Object.keys(fileObjects).length > 0) {
      onFilesUploaded(fileObjects);
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFiles({});
      setFileObjects({});
      setTextValues({});
      onSubmit();
    }, 1500);
  };

  const fields: WorkflowActionField[] = action.fields ?? [
    ...(action.type === "upload" ? [{ name: "document", label: action.label, type: "file" as const }] : []),
    ...(action.type === "confirm" ? [{ name: "confirmation", label: "Confirmation Notes", type: "textarea" as const }] : []),
  ];

  // Auto-populate fields with autoValue
  React.useEffect(() => {
    const autoFields = fields.filter((f) => f.autoValue);
    if (autoFields.length > 0) {
      setTextValues((prev) => {
        const updated = { ...prev };
        autoFields.forEach((f) => {
          if (!updated[f.name]) updated[f.name] = f.autoValue!;
        });
        return updated;
      });
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-md max-h-[85vh] glass-card-elevated p-6 flex flex-col overflow-hidden"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <h3 className="text-lg font-bold font-display text-foreground">Submitted Successfully</h3>
                <p className="text-sm text-muted-foreground">Your action for {requestId} has been recorded.</p>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-foreground">{action.label}</h3>
                    <p className="text-sm text-muted-foreground">{requestId}</p>
                  </div>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                  {fields.map((field) => {
                    if (field.showWhen && textValues[field.showWhen.field] !== field.showWhen.value) return null;
                    return (
                    <div key={field.name}>
                      {field.type === "file" ? (
                        <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-muted/30">
                          {files[field.name] ? (
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <FileText className="w-4 h-4 text-primary" />
                              {files[field.name]}
                            </div>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Click to upload</span>
                            </>
                          )}
                          <input type="file" className="hidden" onChange={(e) => handleFileChange(field.name, e)} />
                        </label>
                      ) : field.type === "textarea" ? (
                        <textarea
                          className="input-glass w-full min-h-[80px] resize-none"
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          value={textValues[field.name] || ""}
                          onChange={(e) => setTextValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        />
                      ) : field.type === "date" ? (
                        <div className="relative">
                          <input
                            type="date"
                            className="input-glass w-full"
                            value={textValues[field.name] || ""}
                            onChange={(e) => setTextValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          />
                          {!textValues[field.name] && (
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                              {`Enter ${field.label.replace(/^Meter\s+/i, "")}`}
                            </span>
                          )}
                        </div>
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          className="input-glass w-full"
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          value={textValues[field.name] || ""}
                          onChange={(e) => setTextValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        />
                      ) : field.type === "select" && field.options ? (
                        <select
                          className="input-glass w-full"
                          value={textValues[field.name] || ""}
                          onChange={(e) => setTextValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        >
                          <option value="">Select {field.label.toLowerCase()}...</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="input-glass w-full"
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          value={textValues[field.name] || ""}
                          readOnly={!!field.autoValue}
                          onChange={(e) => setTextValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        />
                      )}
                    </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-6 shrink-0">
                  <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={handleSubmit} className="btn-primary flex-1">Submit</button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WorkflowActionModal;
