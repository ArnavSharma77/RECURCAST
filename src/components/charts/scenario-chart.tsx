"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fmtCurrency } from "@/lib/model";

interface ScenarioChartProps {
  data: { period: string; base: number; scenario: number }[];
  title: string;
  periodsCompleted: number;
}

export function ScenarioChart({ data, title, periodsCompleted }: ScenarioChartProps) {
  return (
    <div className="spotlight-card p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-5">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
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
          {periodsCompleted > 0 && (
            <ReferenceLine
              x={`P${periodsCompleted}`}
              stroke="#B8860B"
              strokeDasharray="4 4"
              label={{ value: "Actual / Forecast", fill: "#B8860B", fontSize: 9, position: "top" }}
            />
          )}
          <Bar dataKey="base" fill="rgba(30,58,138,0.18)" name="Base Forecast" radius={[6, 6, 0, 0]} />
          <Bar dataKey="scenario" fill="#B8860B" name="Scenario" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
