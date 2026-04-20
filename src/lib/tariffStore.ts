/**
 * Global tariff rate used to compute Security Deposit:
 *   SD = Max Demand (kVAH) × 90 (days) × tariff (₹/kVAH)
 *
 * Editable by P&E. Persisted in localStorage so updates survive reloads
 * within the demo environment.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "sd-tariff-rate";
export const DEFAULT_TARIFF_RATE = 13.65;
export const SD_DAYS = 90;

let tariffRate: number = (() => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TARIFF_RATE;
  } catch {
    return DEFAULT_TARIFF_RATE;
  }
})();

let listeners: Array<() => void> = [];
function notify() {
  listeners.forEach((l) => l());
}

export function getTariffRate() {
  return tariffRate;
}

export function setTariffRate(rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) return;
  tariffRate = rate;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(rate));
  } catch {
    /* ignore */
  }
  notify();
}

export function calculateSdAmount(kvah: number, rate: number = tariffRate): number {
  if (!Number.isFinite(kvah) || kvah <= 0) return 0;
  return Math.round(kvah * SD_DAYS * rate);
}

export function useTariffRate() {
  const [rate, setRate] = useState(tariffRate);
  useEffect(() => {
    const cb = () => setRate(tariffRate);
    listeners.push(cb);
    return () => {
      listeners = listeners.filter((l) => l !== cb);
    };
  }, []);
  return rate;
}
