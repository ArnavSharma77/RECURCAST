"use client";

import { NUM_PERIODS } from "@/lib/model";
import type { StaffType } from "@/lib/model";
import { UserPlus, Briefcase, Settings2 } from "lucide-react";

interface WhatIfSlidersProps {
  weeklyRamp: number[];
  staffCost: number;
  staffStart: number;
  staffType: StaffType;
  operationsEfficiency: number;
  cxOverride: number | null;
  useSameRamp: boolean;
  sameRampValue: number;
  commissionPct: number;
  servicePricePct: number;
  servicePriceStart: number;
  productPricePct: number;
  productPriceStart: number;
  onWeeklyRampChange: (ramp: number[]) => void;
  onStaffCostChange: (v: number) => void;
  onStaffStartChange: (v: number) => void;
  onStaffTypeChange: (v: StaffType) => void;
  onOperationsEfficiencyChange: (v: number) => void;
  onCxOverrideChange: (v: number | null) => void;
  onUseSameRampChange: (v: boolean) => void;
  onSameRampValueChange: (v: number) => void;
  onCommissionPctChange: (v: number) => void;
  onServicePricePctChange: (v: number) => void;
  onServicePriceStartChange: (v: number) => void;
  onProductPricePctChange: (v: number) => void;
  onProductPriceStartChange: (v: number) => void;
}

function SliderField({
  label, value, min, max, step, unit, onChange, sublabel,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-baseline">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">
          {label}
        </label>
        <span className="text-sm font-bold text-slate-900 tabular-nums">
          {unit === "$" ? `$${value.toLocaleString()}` : unit === "%" ? `${Math.round(value)}%` : `P${value}`}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
      {sublabel && <span className="text-[10px] text-slate-500 leading-relaxed">{sublabel}</span>}
    </div>
  );
}

const STAFF_TYPES: { value: StaffType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "sales", label: "Salesperson", desc: "Generates revenue via new sales", icon: <UserPlus className="w-3.5 h-3.5" /> },
  { value: "office", label: "Office / Admin", desc: "Fixed cost, no direct revenue", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { value: "operations", label: "Operations Mgr", desc: "Reduces operating expenses", icon: <Settings2 className="w-3.5 h-3.5" /> },
];

export function WhatIfSliders(props: WhatIfSlidersProps) {
  const {
    weeklyRamp, staffCost, staffStart, staffType, operationsEfficiency,
    cxOverride, useSameRamp, sameRampValue, commissionPct,
    servicePricePct, servicePriceStart, productPricePct, productPriceStart,
    onWeeklyRampChange, onStaffCostChange, onStaffStartChange,
    onStaffTypeChange, onOperationsEfficiencyChange,
    onCxOverrideChange, onUseSameRampChange, onSameRampValueChange,
    onCommissionPctChange,
    onServicePricePctChange, onServicePriceStartChange,
    onProductPricePctChange, onProductPriceStartChange,
  } = props;

  const handleSameRamp = (val: number) => {
    onSameRampValueChange(val);
    const newRamp = weeklyRamp.map((v, i) => (i + 1) >= staffStart ? val : 0);
    onWeeklyRampChange(newRamp);
  };

  const handleStaffStartChange = (val: number) => {
    onStaffStartChange(val);
    if (useSameRamp) {
      const newRamp = weeklyRamp.map((_, i) => (i + 1) >= val ? sameRampValue : 0);
      onWeeklyRampChange(newRamp);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-900 animate-pulse" />
        Scenario Controls
      </h3>

      {/* Staff Type Selector */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Staff Type</span>
        <div className="grid grid-cols-1 gap-2">
          {STAFF_TYPES.map(st => (
            <button
              key={st.value}
              onClick={() => onStaffTypeChange(st.value)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                staffType === st.value
                  ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200/50"
                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
              }`}
            >
              <span className={`${staffType === st.value ? "text-indigo-900" : "text-slate-400"} transition-colors`}>
                {st.icon}
              </span>
              <div>
                <span className={`text-xs font-semibold ${staffType === st.value ? "text-indigo-900" : "text-slate-700"}`}>
                  {st.label}
                </span>
                <span className="text-[10px] text-slate-500 ml-2">{st.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <SliderField
        label="Staff Cost (per 4-week period)" value={staffCost}
        min={0} max={15000} step={500} unit="$"
        onChange={onStaffCostChange}
        sublabel="Per period (salary + car + taxes + benefits)"
      />

      {staffType === "sales" && (
        <SliderField
          label="Commission Rate" value={commissionPct}
          min={0} max={25} step={1} unit="%"
          onChange={onCommissionPctChange}
          sublabel="% of annualized sales volume paid as commission"
        />
      )}

      <SliderField
        label="Staff Start Period" value={staffStart}
        min={1} max={13} step={1} unit="P"
        onChange={handleStaffStartChange}
      />

      {/* Operations Manager: Efficiency slider */}
      {staffType === "operations" && (
        <SliderField
          label="Operating Expense Reduction" value={Math.round(operationsEfficiency * 100)}
          min={0} max={20} step={1} unit="%"
          onChange={v => onOperationsEfficiencyChange(v / 100)}
          sublabel="% reduction in base operating expenses when active"
        />
      )}

      {/* Sales-specific controls: revenue ramp */}
      {staffType === "sales" && (
        <>
          <div className="flex items-center gap-3">
            <input
              type="checkbox" checked={useSameRamp} id="sameRamp"
              onChange={e => {
                onUseSameRampChange(e.target.checked);
                if (e.target.checked) handleSameRamp(sameRampValue);
              }}
              className="rounded border-gray-300 bg-white text-indigo-900 focus:ring-indigo-900 cursor-pointer
                w-4 h-4 transition-colors duration-150"
            />
            <label htmlFor="sameRamp" className="text-xs text-slate-400 cursor-pointer select-none">
              Same weekly average for all active periods
            </label>
          </div>

          {useSameRamp ? (
            <SliderField
              label="Weekly Sales Avg" value={sameRampValue}
              min={0} max={1000} step={25} unit="$"
              onChange={handleSameRamp}
              sublabel="New sales $/wk for all periods from start"
            />
          ) : (
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">
                Per-Period Weekly Sales Forecast ($/wk)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {weeklyRamp.map((val, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">P{i + 1}</span>
                    <span className="text-slate-300">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val}
                      onChange={e => {
                        const newRamp = [...weeklyRamp];
                        newRamp[i] = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                        onWeeklyRampChange(newRamp);
                      }}
                      className="w-full text-right text-xs font-semibold text-slate-900 bg-transparent
                                 focus:outline-none tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">Enter the average new sales $/week for each period. Set to 0 for periods before hire.</p>
            </div>
          )}
        </>
      )}

      <SliderField
        label="Cancellation Rate (Total)" value={cxOverride !== null ? Math.round(cxOverride * 100) : 10}
        min={0} max={30} step={1} unit="%"
        onChange={v => onCxOverrideChange(v / 100)}
        sublabel="Budget rate is 10%. Set lower for retention gains, higher for churn losses."
      />

      <div className="border-t border-slate-100 pt-5 space-y-5">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Price Increase Scenario
        </h4>

        <SliderField
          label="Service Price Increase" value={servicePricePct}
          min={0} max={25} step={1} unit="%"
          onChange={onServicePricePctChange}
          sublabel="% increase applied to recurring service revenue"
        />
        <SliderField
          label="Service Increase Start" value={servicePriceStart}
          min={1} max={13} step={1} unit="P"
          onChange={onServicePriceStartChange}
          sublabel="Period service price increase takes effect"
        />

        <SliderField
          label="Product Price Increase" value={productPricePct}
          min={0} max={25} step={1} unit="%"
          onChange={onProductPricePctChange}
          sublabel="% increase applied to product revenue"
        />
        <SliderField
          label="Product Increase Start" value={productPriceStart}
          min={1} max={13} step={1} unit="P"
          onChange={onProductPriceStartChange}
          sublabel="Period product price increase takes effect"
        />
      </div>
    </div>
  );
}
