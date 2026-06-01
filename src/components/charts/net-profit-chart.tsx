"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

interface NetProfitChartProps {
  data: { period: string; profitPct: number; rollingYtdPct: number; isActual: boolean }[];
  ytdPct: number;
  periodsCompleted: number;
}

export function NetProfitChart({ data, ytdPct, periodsCompleted }: NetProfitChartProps) {
  return (
    <div className="spotlight-card p-5 sm:p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-0.5">Net Profit Margin by Period</h3>
          <p className="text-[11px] text-slate-400">P1-P{periodsCompleted} actuals, then forecast. Gold line = rolling YTD.</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ytdPct >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          YTD: {(ytdPct * 100).toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="period" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            axisLine={{ stroke: "#E2E8F0" }}
          />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}
            labelStyle={{ color: "#0F172A", fontWeight: 600, fontSize: 12 }}
            itemStyle={{ color: "#1E293B" }}
            formatter={(v, name) => {
              const label = String(name).includes("Rolling") ? "Rolling Net Profit %" : "Period Net Profit %";
              return [`${(Number(v) * 100).toFixed(1)}%`, label];
            }}
            cursor={{ fill: "rgba(30,42,94,0.025)" }}
            wrapperStyle={{ outline: "none" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 10 }}
            formatter={(value) => String(value).includes("Rolling") ? "Rolling Net Profit" : "Period Net Profit"}
          />
          <ReferenceLine y={0} stroke="#CBD5E1" />
          <Bar dataKey="profitPct" name="Net Profit %" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isActual
                  ? (entry.profitPct >= 0 ? "#065F46" : "#991B1B")
                  : "rgba(30,58,138,0.15)"}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="rollingYtdPct"
            name="Rolling YTD Net Profit %"
            stroke="#B8860B"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "#B8860B", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "#D4AF37", stroke: "#fff", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
