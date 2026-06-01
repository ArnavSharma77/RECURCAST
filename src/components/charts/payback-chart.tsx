"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fmtCurrency } from "@/lib/model";

interface PaybackChartProps {
  data: { period: string; cumCost: number; cumAGP: number }[];
  breakevenPeriod: number | null;
}

export function PaybackChart({ data, breakevenPeriod }: PaybackChartProps) {
  return (
    <div className="spotlight-card p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Salesperson Payback Curve</h3>
      <p className="text-[11px] text-slate-400 mb-5">Cumulative staff cost vs cumulative AGP from new revenue</p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="period" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} />
          <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: "#E2E8F0" }} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}
            labelStyle={{ color: "#0F172A", fontWeight: 600, fontSize: 12 }}
            itemStyle={{ color: "#1E293B" }}
            formatter={(v) => fmtCurrency(Number(v))}
            wrapperStyle={{ outline: "none" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 10 }} />
          <Area
            type="monotone" dataKey="cumCost" fill="rgba(153,27,27,0.06)" stroke="#991B1B"
            strokeWidth={2} name="Cum. Staff Cost"
          />
          <Area
            type="monotone" dataKey="cumAGP" fill="rgba(6,95,70,0.06)" stroke="#065F46"
            strokeWidth={2} name="Cum. AGP (New Rev)"
          />
          {breakevenPeriod && (
            <ReferenceLine
              x={`P${breakevenPeriod}`}
              stroke="#B8860B"
              strokeDasharray="4 4"
              label={{ value: "Breakeven", fill: "#B8860B", fontSize: 10, position: "top" }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
