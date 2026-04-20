import { FileText, Download, Eye, ImageIcon, FileType2 } from "lucide-react";
import type { StoredDocument } from "@/lib/documentStore";

interface DocumentLinkProps {
  doc: StoredDocument;
  /** Override the label shown next to the file (defaults to doc.label). */
  label?: string;
  /** Compact = small inline chip; "card" = full-width row with preview + download. */
  variant?: "chip" | "card";
}

/**
 * Renders an uploaded document with preview ("Open") + Download buttons.
 * Works for in-memory blob URLs created by documentStore.
 */
const DocumentLink = ({ doc, label, variant = "card" }: DocumentLinkProps) => {
  const isImage = doc.type.startsWith("image/");
  const isPdf = doc.type === "application/pdf";
  const Icon = isImage ? ImageIcon : isPdf ? FileType2 : FileText;
  const displayLabel = label ?? doc.label;

  if (variant === "chip") {
    return (
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md hover:bg-primary/20 transition-colors"
        title={`${displayLabel} – ${doc.name}`}
      >
        <Icon className="w-3 h-3" />
        <span className="font-medium">{displayLabel}</span>
        <span className="text-[10px] text-primary/70 max-w-[120px] truncate">({doc.name})</span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{displayLabel}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {doc.name} • {(doc.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-info/10 text-info hover:bg-info/20 transition-colors"
          title="Open in new tab"
        >
          <Eye className="w-3 h-3" /> Open
        </a>
        <a
          href={doc.url}
          download={doc.name}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Download"
        >
          <Download className="w-3 h-3" /> Save
        </a>
      </div>
    </div>
  );
};

export default DocumentLink;
