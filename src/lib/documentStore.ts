// In-memory document store. Files persist for the lifetime of the browser tab
// (so different roles can see each other's uploads as long as the tab isn't refreshed).
// Refreshing clears everything — same model as the other in-memory stores.

import { useEffect, useState } from "react";

export interface StoredDocument {
  /** Original file name, e.g. "noc.pdf" */
  name: string;
  /** MIME type, e.g. "application/pdf" or "image/png" */
  type: string;
  /** Object URL (blob:) usable as href / src for preview & download. */
  url: string;
  /** Bytes – purely informational. */
  size: number;
  /** When it was uploaded (ISO). */
  uploadedAt: string;
  /** Free-form label shown in dashboards (e.g. "NOC", "SD Waiver Proof"). */
  label: string;
}

/** Key = `${requestId}::${slot}` so each request can carry many uploads. */
const docs = new Map<string, StoredDocument>();
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

function k(requestId: string, slot: string) {
  return `${requestId}::${slot}`;
}

/** Upload (or replace) a file for a request. The slot is a stable name like "noc". */
export function saveDocument(
  requestId: string,
  slot: string,
  file: File,
  label?: string,
): StoredDocument {
  // Revoke any existing URL for that slot to avoid leaks.
  const existing = docs.get(k(requestId, slot));
  if (existing) {
    try { URL.revokeObjectURL(existing.url); } catch { /* noop */ }
  }
  const stored: StoredDocument = {
    name: file.name,
    type: file.type || "application/octet-stream",
    url: URL.createObjectURL(file),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    label: label || slot,
  };
  docs.set(k(requestId, slot), stored);
  notify();
  return stored;
}

/** Look up a single uploaded document. */
export function getDocument(requestId: string, slot: string): StoredDocument | undefined {
  return docs.get(k(requestId, slot));
}

/** All uploaded docs for a request, returned as { slot, doc } pairs. */
export function getDocumentsForRequest(requestId: string): { slot: string; doc: StoredDocument }[] {
  const result: { slot: string; doc: StoredDocument }[] = [];
  const prefix = `${requestId}::`;
  for (const [key, doc] of docs.entries()) {
    if (key.startsWith(prefix)) {
      result.push({ slot: key.slice(prefix.length), doc });
    }
  }
  return result;
}

/** Subscribe-only hook so components re-render when uploads change. */
export function useDocumentStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.push(rerender);
    return () => {
      listeners = listeners.filter((l) => l !== rerender);
    };
  }, []);
  return {
    saveDocument,
    getDocument,
    getDocumentsForRequest,
  };
}
