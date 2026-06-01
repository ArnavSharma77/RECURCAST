"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { fmtCurrency, fmtPct } from "@/lib/model";
import { SERVICES, type ServiceName, getServiceLabel, getServiceColor } from "@/lib/services";
import { getDemoServiceData, getRollingServiceForecast, type ServicePeriodData } from "@/lib/service-demo-data";
import { supabase } from "@/lib/supabase/client";
import type { ClientRow } from "@/lib/supabase/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart,
} from "recharts";

function getClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )rc_client=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const CHART_GRID = "#F1F5F9";
const CHART_AXIS_TICK = "#64748B";
const CHART_AXIS_LINE = "#E2E8F0";

const PALETTE = {
  budget: "rgba(30,58,138,0.18)",
  actual: "#1E3A8A",
  forecast: "#B8860B",
  agpActual: "#065F46",
  labor: "#4338CA",
  laborForecast: "rgba(67,56,202,0.25)",
  cogs: "#1E3A8A",
  sales: "#4338CA",
  opex: "#065F46",
  overheadBudget: "#1E3A8A",
  overheadActual: "#B8860B",
};

export default function ServiceDeepDive() {
  const params = useParams();
  const router = useRouter();
  const serviceKey = params.service as ServiceName;
  const [loading, setLoading] = useState(true);
  const [periodsCompleted, setPc] = useState(5);
  const [clientName, setClientName] = useState("");
  const [budget, setBudget] = useState<ServicePeriodData[]>([]);
  const [actuals, setActuals] = useState<ServicePeriodData[]>([]);
  const [forecast, setForecast] = useState<ServicePeriodData[]>([]);

  const valid = SERVICES.some(s => s.key === serviceKey);

  useEffect(() => {
    if (!valid) { router.replace("/premium"); return; }

    async function load() {
      const clientId = getClientId();
      if (!clientId) { router.replace("/login"); return; }

      let pc = 5;
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single();

        if (client) {
          const c = client as ClientRow;
          setClientName(c.name);
          pc = c.periods_completed;
          setPc(pc);
        }
      } catch {}

      const allData = getDemoServiceData(pc);
      const svcData = allData[serviceKey];
      setBudget(svcData.budget);
      setActuals(svcData.actuals);
      setForecast(svcData.forecast);
      setLoading(false);
    }
    load();
  }, [serviceKey, valid]);

  if (!valid) return null;

  if (loading) {
    return (
      <div className="page-ambient min-h-screen text-slate-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-900" />
      </div>
    );
  }

  const rolling = getRollingServiceForecast(actuals, forecast, periodsCompleted);
  const color = getServiceColor(serviceKey);
  const label = getServiceLabel(serviceKey);
  const svcDef = SERVICES.find(s => s.key === serviceKey);

  const ytdActuals = rolling.slice(0, periodsCompleted);
  const ytdBudget = budget.slice(0, periodsCompleted);
  const ytdRev = ytdActuals.reduce((s, p) => s + p.revenue, 0);
  const ytdBudgetRev = ytdBudget.reduce((s, p) => s + p.revenue, 0);
  const ytdRevVar = ytdRev - ytdBudgetRev;
  const ytdAGP = ytdActuals.reduce((s, p) => s + p.agp, 0);
  const ytdBudgetAGP = ytdBudget.reduce((s, p) => s + p.agp, 0);
  const ytdAGPVar = ytdAGP - ytdBudgetAGP;
  const ytdLabor = ytdActuals.reduce((s, p) => s + p.laborCost, 0);
  const ytdCOGS = ytdActuals.reduce((s, p) => s + p.cogs, 0);
  const agpPct = ytdRev > 0 ? ytdAGP / ytdRev : 0;
  const laborPct = ytdRev > 0 ? ytdLabor / ytdRev : 0;

  const revenueChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.revenue : null,
    budget: budget[i]?.revenue ?? 0,
    forecast: p.revenue,
  }));

  const agpChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.agp : null,
    budget: budget[i]?.agp ?? 0,
    forecast: p.agp,
  }));

  const laborChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.laborCost : null,
    forecast: forecast[i]?.laborCost ?? 0,
    pctOfRev: p.revenue > 0 ? (p.laborCost / p.revenue) * 100 : 0,
  }));

  const cogsChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.cogs : null,
    budget: budget[i]?.cogs ?? 0,
  }));


  const tooltipStyle = {
    contentStyle: { background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 8px 32px rgba(30,42,94,0.08)" },
    labelStyle: { color: "#1E293B", fontWeight: 600, fontSize: 12 },
    itemStyle: { color: "#1E293B", fontSize: 11 },
    cursor: { fill: "rgba(30,42,94,0.025)" },
    wrapperStyle: { outline: "none" },
  };

  return (
    <div className="page-ambient min-h-screen text-slate-900">
      <Nav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/premium"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white
              hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{ background: color }}
              >
                {svcDef?.icon ?? ""}
              </span>
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{label} Analytics</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 pl-[38px]">
              {clientName} &middot; {periodsCompleted} periods completed
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiMini label="YTD Revenue" value={fmtCurrency(ytdRev)} sub={`Var: ${fmtCurrency(ytdRevVar)}`} positive={ytdRevVar >= 0} />
          <KpiMini label="AGP" value={fmtCurrency(ytdAGP)} sub={`Var: ${fmtCurrency(ytdAGPVar)}`} positive={ytdAGPVar >= 0} />
          <KpiMini label="AGP Margin" value={fmtPct(agpPct)} />
          <KpiMini label="YTD Labor" value={fmtCurrency(ytdLabor)} sub={`${(laborPct * 100).toFixed(1)}% of rev`} />
          <KpiMini label="YTD COGS" value={fmtCurrency(ytdCOGS)} />
        </div>

        <ChartPanel title="Revenue: Actual vs Budget vs Forecast" subtitle="Period-level revenue tracking with rolling forecast overlay">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <YAxis tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
              <Bar dataKey="budget" fill={PALETTE.budget} name="Budget" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill={color} name="Actual" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="forecast" stroke={PALETTE.forecast} strokeWidth={2} dot={{ r: 2.5, fill: PALETTE.forecast }} name="Forecast" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="AGP: Actual vs Budget vs Forecast" subtitle="Adjusted Gross Profit tracking per period">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={agpChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <YAxis tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
              <Bar dataKey="budget" fill={PALETTE.budget} name="Budget" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill={PALETTE.agpActual} name="Actual" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="forecast" stroke={PALETTE.forecast} strokeWidth={2} dot={{ r: 2.5, fill: PALETTE.forecast }} name="Forecast" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Labor Cost: Actual vs Forecast" subtitle="Labor cost per period with % of revenue trend">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={laborChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <YAxis yAxisId="left" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <Tooltip {...tooltipStyle} formatter={(v, name) => [String(name).includes("pct") ? `${Number(v).toFixed(1)}%` : fmtCurrency(Number(v)), name]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
              <Bar yAxisId="left" dataKey="actual" fill={PALETTE.labor} name="Actual Labor" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="forecast" fill={PALETTE.laborForecast} name="Forecast Labor" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="pctOfRev" stroke={PALETTE.forecast} strokeWidth={2} dot={{ r: 2.5, fill: PALETTE.forecast }} name="% of Revenue" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="COGS: Actual vs Budget" subtitle="Cost of goods sold variance tracking">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cogsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <YAxis tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
              <Bar dataKey="budget" fill={PALETTE.budget} name="Budget" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill={PALETTE.cogs} name="Actual" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>


        <div className="spotlight-card p-5 sm:p-6 overflow-x-auto">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Period Detail</h3>
          <p className="text-[11px] text-slate-500 mb-5">All metrics by period</p>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="py-2.5 px-2 text-left font-medium">Period</th>
                <th className="py-2.5 px-2 text-left font-medium">Type</th>
                <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                <th className="py-2.5 px-2 text-right font-medium">COGS</th>
                <th className="py-2.5 px-2 text-right font-medium">AGP</th>
                <th className="py-2.5 px-2 text-right font-medium">AGP %</th>
                <th className="py-2.5 px-2 text-right font-medium">Labor</th>
                <th className="py-2.5 px-2 text-right font-medium">Labor %</th>
              </tr>
            </thead>
            <tbody>
              {rolling.map((p, i) => (
                <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 ${i < periodsCompleted ? "bg-indigo-50/30" : ""}`}>
                  <td className="py-2 px-2 font-medium text-slate-700">P{i + 1}</td>
                  <td className="py-2 px-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i < periodsCompleted ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                      {i < periodsCompleted ? "Actual" : "Forecast"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-900 tabular-nums">{fmtCurrency(p.revenue)}</td>
                  <td className="py-2 px-2 text-right text-slate-500 tabular-nums">{fmtCurrency(p.cogs)}</td>
                  <td className="py-2 px-2 text-right text-emerald-800 tabular-nums">{fmtCurrency(p.agp)}</td>
                  <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{p.revenue > 0 ? `${((p.agp / p.revenue) * 100).toFixed(1)}%` : "N/A"}</td>
                  <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{fmtCurrency(p.laborCost)}</td>
                  <td className="py-2 px-2 text-right text-slate-400 tabular-nums">{p.revenue > 0 ? `${((p.laborCost / p.revenue) * 100).toFixed(1)}%` : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {SERVICES.filter(s => s.key !== serviceKey).map(svc => (
            <Link
              key={svc.key}
              href={`/premium/${svc.key}`}
              className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2
                text-xs text-slate-500 hover:text-slate-900 hover:border-indigo-200 transition-all duration-200"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: svc.color }}
              />
              {svc.label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="spotlight-card p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-[11px] text-slate-500 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function KpiMini({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mb-1.5">{label}</p>
      <p className="text-base font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && (
        <p className={`text-[10px] mt-1 tabular-nums ${positive === true ? "text-emerald-700" : positive === false ? "text-red-600" : "text-slate-500"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
