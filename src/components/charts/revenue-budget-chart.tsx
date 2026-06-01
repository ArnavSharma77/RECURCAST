"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { fmtCurrency } from "@/lib/model";

interface RevenueBudgetChartProps {
  data: {
    period: string;
    budget: number;
    actual: number | null;
    forecast: number;
    variance: number;
  }[];
  periodsCompleted: number;
}

export function RevenueBudgetChart({ data, periodsCompleted }: RevenueBudgetChartProps) {
  return (
    <div className="spotlight-card p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">
        Revenue: Budget vs Actual/Forecast
      </h3>
      <p className="text-[11px] text-slate-400 mb-5">
        P1-P{periodsCompleted} show actuals. Remaining periods show budget with rolling forecast overlay.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} style={{ background: "transparent" }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" fill="transparent" />
          <XAxis dataKey="period" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickFormatter={(v: number) => fmtCurrency(v, true)}
            axisLine={{ stroke: "#E2E8F0" }}
          />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}
            labelStyle={{ color: "#0F172A", fontWeight: 600, fontSize: 12 }}
            itemStyle={{ color: "#1E293B" }}
            formatter={(v) => fmtCurrency(Number(v))}
            cursor={{ fill: "rgba(30,42,94,0.025)" }}
            wrapperStyle={{ outline: "none" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 10 }} />
          <Bar dataKey="budget" fill="rgba(30,58,138,0.15)" name="Budget" radius={[6, 6, 0, 0]} />
          <Bar dataKey="actual" fill="#1E3A8A" name="Actual" radius={[6, 6, 0, 0]} />
          <Line
            type="monotone" dataKey="forecast" stroke="#B8860B"
            strokeWidth={2.5} dot={{ r: 3.5, fill: "#B8860B", strokeWidth: 0 }} name="Rolling Forecast"
            strokeDasharray="6 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
