// Tracks customers attached to a SPOC department (Aero / Non-Aero).
// A customer becomes attached the first time they submit a connection request,
// based on the department selected in the Address & Docs step.

import { useState, useEffect, useCallback } from "react";

export type Department = "aero" | "non-aero";

export interface Customer {
  mobile: string; // primary key
  department: Department;
  customerName?: string;
  customerCode?: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  notes?: string;
  attachedAt: string;
}

const INITIAL_CUSTOMERS: Customer[] = [
  {
    mobile: "9876543210", department: "aero", customerName: "Acme Corp",
    customerCode: "CC-1001", contactPerson: "Rahul Sharma", email: "rahul@acme.com",
    address: "Tower A, Block 4, Cyber City", gstin: "27AABCA1234F1Z5",
    pan: "AABCA1234F", attachedAt: "2024-01-12",
  },
  {
    mobile: "9123456780", department: "non-aero", customerName: "BuildRight Infra",
    customerCode: "CC-2045", contactPerson: "Priya Nair", email: "priya@buildright.in",
    address: "Plot 7, Industrial Area Phase-II", gstin: "27AABCB1234F1ZP",
    pan: "AABCB1234F", attachedAt: "2024-01-18",
  },
  {
    mobile: "9871234567", department: "aero", customerName: "HydroTech Solutions",
    customerCode: "CC-4012", contactPerson: "Meera Patel", email: "meera@hydrotech.co",
    address: "Unit 12, Trade Centre, Sector 5", attachedAt: "2024-02-10",
  },
];

let customers: Customer[] = [...INITIAL_CUSTOMERS];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

function normMobile(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

/** Attach a customer to a department on their first request (idempotent). */
export function attachCustomerToDepartment(input: {
  mobile: string;
  department: Department;
  customerName?: string;
  customerCode?: string;
  contactPerson?: string;
  email?: string;
  address?: string;
}) {
  const mobile = normMobile(input.mobile);
  if (!mobile || !input.department) return;

  const existing = customers.find((c) => c.mobile === mobile);
  if (existing) {
    // Already attached — do not reassign department, but enrich missing fields.
    customers = customers.map((c) =>
      c.mobile === mobile
        ? {
            ...c,
            customerName: c.customerName || input.customerName,
            customerCode: c.customerCode || input.customerCode,
            contactPerson: c.contactPerson || input.contactPerson,
            email: c.email || input.email,
            address: c.address || input.address,
          }
        : c,
    );
    notify();
    return;
  }

  customers = [
    {
      mobile,
      department: input.department,
      customerName: input.customerName,
      customerCode: input.customerCode,
      contactPerson: input.contactPerson,
      email: input.email,
      address: input.address,
      attachedAt: new Date().toISOString().split("T")[0],
    },
    ...customers,
  ];
  notify();
}

export function updateCustomer(
  mobile: string,
  updates: Partial<Omit<Customer, "attachedAt">>,
): { ok: boolean; error?: string; newMobile?: string } {
  const norm = normMobile(mobile);
  const target = customers.find((c) => c.mobile === norm);
  if (!target) return { ok: false, error: "Customer not found" };

  let nextMobile = norm;
  if (updates.mobile !== undefined) {
    const candidate = normMobile(updates.mobile);
    if (candidate.length < 10) return { ok: false, error: "Mobile must be at least 10 digits" };
    if (candidate !== norm && customers.some((c) => c.mobile === candidate)) {
      return { ok: false, error: "Another customer is already attached to that mobile" };
    }
    nextMobile = candidate;
  }

  const { mobile: _ignored, ...rest } = updates;
  customers = customers.map((c) => (c.mobile === norm ? { ...c, ...rest, mobile: nextMobile } : c));
  notify();
  return { ok: true, newMobile: nextMobile };
}

export function getCustomersByDepartment(dept: Department): Customer[] {
  return customers.filter((c) => c.department === dept);
}

export function useCustomerStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.push(rerender);
    return () => {
      listeners = listeners.filter((l) => l !== rerender);
    };
  }, []);

  return {
    customers,
    byDepartment: useCallback((dept: Department) => customers.filter((c) => c.department === dept), []),
    update: useCallback((mobile: string, updates: Partial<Omit<Customer, "attachedAt">>) => updateCustomer(mobile, updates), []),
  };
}
