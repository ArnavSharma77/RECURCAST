"use client";

import { ReactNode } from "react";

type BadgeVariant = "actual" | "forecast" | "neutral" | "success" | "warning" | "error";

const variantStyles: Record<BadgeVariant, string> = {
  actual: "bg-emerald-50 text-emerald-700 border-emerald-200",
  forecast: "bg-indigo-50 text-indigo-800 border-indigo-200",
  neutral: "bg-slate-50 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

interface StatusBadgeProps {
  variant?: BadgeVariant;
  pulse?: boolean;
  children: ReactNode;
}

export function StatusBadge({ variant = "neutral", pulse, children }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${variantStyles[variant]}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
