"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { fmtCurrency } from "@/lib/model";

interface VarianceChartProps {
  data: { period: string; variance: number; pct: number }[];
}

export function VarianceChart({ data }: VarianceChartProps) {
  return (
    <div className="spotlight-card p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">
        Net Income Variance
      </h3>
      <p className="text-[11px] text-slate-400 mb-5">Actual Net Income minus Budget Net Income per completed period</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} style={{ background: "transparent" }}>
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
            itemStyle={{ color: "#475569", fontSize: 12 }}
            formatter={(v, name) => [fmtCurrency(Number(v)), name]}
            cursor={{ fill: "rgba(30,42,94,0.025)" }}
            wrapperStyle={{ outline: "none" }}
          />
          <ReferenceLine y={0} stroke="#CBD5E1" />
          <Bar dataKey="variance" name="Net Income Variance ($)" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.variance >= 0 ? "#065F46" : "#991B1B"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
