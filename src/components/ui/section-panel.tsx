"use client";

import { ReactNode } from "react";

interface SectionPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionPanel({ title, subtitle, children, action, className = "", noPadding }: SectionPanelProps) {
  return (
    <div className={`elegant-card ${className}`}>
      <div className="flex items-start justify-between px-5 pt-5 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className={noPadding ? "pt-4" : "p-5"}>
        {children}
      </div>
    </div>
  );
}
