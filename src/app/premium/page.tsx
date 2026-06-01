"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { fmtCurrency, fmtPct } from "@/lib/model";
import { SERVICES, type ServiceName } from "@/lib/services";
import { getDemoServiceData, getRollingServiceForecast, type ServicePeriodData } from "@/lib/service-demo-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import type { ClientRow } from "@/lib/supabase/types";
import { Crown, ArrowRight, Loader2 } from "lucide-react";

function getClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )rc_client=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function PremiumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [periodsCompleted, setPc] = useState(5);
  const [serviceData, setServiceData] = useState<ReturnType<typeof getDemoServiceData> | null>(null);

  useEffect(() => {
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

      setServiceData(getDemoServiceData(pc));
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !serviceData) {
    return (
      <div className="page-ambient min-h-screen text-slate-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-900" />
      </div>
    );
  }

  return (
    <div className="page-ambient min-h-screen text-slate-900">
      <Nav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E2A5E] to-[#4338CA] shadow-lg shadow-indigo-900/20">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Premium Analytics</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {clientName || "Service-level"} &middot; Per-service financial deep dive
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Service Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map(svc => {
            const data = serviceData[svc.key];
            const rolling = getRollingServiceForecast(data.actuals, data.forecast, periodsCompleted);
            const ytdRev = rolling.slice(0, periodsCompleted).reduce((s, p) => s + p.revenue, 0);
            const ytdBudgetRev = data.budget.slice(0, periodsCompleted).reduce((s, p) => s + p.revenue, 0);
            const variance = ytdRev - ytdBudgetRev;
            const ytdAGP = rolling.slice(0, periodsCompleted).reduce((s, p) => s + p.agp, 0);
            const agpPct = ytdRev > 0 ? ytdAGP / ytdRev : 0;

            return (
              <Link
                key={svc.key}
                href={`/premium/${svc.key}`}
                className="group relative overflow-hidden spotlight-card p-5"
              >
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: svc.color }} />
                <div className="flex items-center gap-2.5 mb-3">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                    style={{ background: svc.color }}
                  >
                    {svc.icon}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{svc.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 ml-auto group-hover:text-indigo-900 transition-colors duration-300" />
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em]">YTD Revenue</p>
                    <p className="text-lg font-bold text-slate-900 tabular-nums">{fmtCurrency(ytdRev)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-[0.1em]">Variance</p>
                      <p className={`text-xs font-bold tabular-nums ${variance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {fmtCurrency(variance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-[0.1em]">AGP %</p>
                      <p className="text-xs font-bold text-slate-900 tabular-nums">{fmtPct(agpPct)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Combined Revenue Comparison */}
        <div className="spotlight-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Revenue by Service, YTD Comparison</h3>
          <p className="text-[11px] text-slate-500 mb-5">Actual vs Budget for first {periodsCompleted} periods</p>

          <div className="flex items-center gap-4 mb-2">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider w-16 shrink-0">Service</span>
            <span className="flex-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">YTD Actual Revenue</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider w-14 text-right">% of Budget</span>
          </div>
          <div className="space-y-3">
            {SERVICES.map(svc => {
              const data = serviceData[svc.key];
              const rolling = getRollingServiceForecast(data.actuals, data.forecast, periodsCompleted);
              const ytdRev = rolling.slice(0, periodsCompleted).reduce((s, p) => s + p.revenue, 0);
              const ytdBudgetRev = data.budget.slice(0, periodsCompleted).reduce((s, p) => s + p.revenue, 0);
              const pct = ytdBudgetRev > 0 ? (ytdRev / ytdBudgetRev) * 100 : 0;
              const barWidth = Math.min(pct, 120);

              return (
                <div key={svc.key} className="flex items-center gap-4">
                  <span className="text-xs font-medium text-slate-500 w-16 shrink-0">{svc.label}</span>
                  <div className="flex-1 relative h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                      style={{ width: `${Math.min(barWidth, 100)}%`, background: `linear-gradient(90deg, ${svc.color}22, ${svc.color}88)` }}
                    />
                    <div className="absolute inset-y-0 flex items-center px-3">
                      <span className="text-[11px] font-bold text-slate-900 tabular-nums">
                        {fmtCurrency(ytdRev)}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold tabular-nums w-14 text-right ${pct >= 100 ? "text-emerald-700" : "text-slate-500"}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Service Detail Table */}
        <div className="spotlight-card p-5 sm:p-6 overflow-x-auto">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Service Summary</h3>
          <p className="text-[11px] text-slate-500 mb-5">YTD performance across all services</p>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="py-2.5 px-2 text-left font-medium">Service</th>
                <th className="py-2.5 px-2 text-right font-medium">YTD Revenue</th>
                <th className="py-2.5 px-2 text-right font-medium">Budget</th>
                <th className="py-2.5 px-2 text-right font-medium">Variance</th>
                <th className="py-2.5 px-2 text-right font-medium">AGP</th>
                <th className="py-2.5 px-2 text-right font-medium">AGP %</th>
                <th className="py-2.5 px-2 text-right font-medium">Labor</th>
                <th className="py-2.5 px-2 text-right font-medium">COGS</th>
              </tr>
            </thead>
            <tbody>
              {SERVICES.map(svc => {
                const data = serviceData[svc.key];
                const rolling = getRollingServiceForecast(data.actuals, data.forecast, periodsCompleted);
                const slice = rolling.slice(0, periodsCompleted);
                const ytdRev = slice.reduce((s, p) => s + p.revenue, 0);
                const budgetRev = data.budget.slice(0, periodsCompleted).reduce((s, p) => s + p.revenue, 0);
                const variance = ytdRev - budgetRev;
                const agp = slice.reduce((s, p) => s + p.agp, 0);
                const labor = slice.reduce((s, p) => s + p.laborCost, 0);
                const cogs = slice.reduce((s, p) => s + p.cogs, 0);

                return (
                  <tr key={svc.key} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: svc.color }}
                        />
                        {svc.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-900 tabular-nums font-medium">{fmtCurrency(ytdRev)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 tabular-nums">{fmtCurrency(budgetRev)}</td>
                    <td className={`py-2.5 px-2 text-right tabular-nums font-medium ${variance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {fmtCurrency(variance)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-900 tabular-nums">{fmtCurrency(agp)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-900 tabular-nums">{ytdRev > 0 ? fmtPct(agp / ytdRev) : "N/A"}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 tabular-nums">{fmtCurrency(labor)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400 tabular-nums">{fmtCurrency(cogs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Overall Expenses */}
        <OverallExpenses periodsCompleted={periodsCompleted} serviceData={serviceData} />

        {/* Link to individual services */}
        <div className="spotlight-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Service Deep Dives</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SERVICES.map(svc => (
              <Link
                key={svc.key}
                href={`/premium/${svc.key}`}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3
                  transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                  style={{ background: svc.color }}
                >
                  {svc.icon}
                </span>
                <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{svc.label}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 ml-auto group-hover:text-indigo-900 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function OverallExpenses({ periodsCompleted, serviceData }: { periodsCompleted: number; serviceData: ReturnType<typeof getDemoServiceData> }) {
  const chartData = Array.from({ length: 13 }, (_, i) => {
    let sales = 0, opex = 0, overhead = 0;
    let budgetSales = 0, budgetOpex = 0, budgetOverhead = 0;

    for (const svc of SERVICES) {
      const data = serviceData[svc.key];
      const rolling = getRollingServiceForecast(data.actuals, data.forecast, periodsCompleted);
      sales += rolling[i]?.salesCost ?? 0;
      opex += rolling[i]?.operatingCost ?? 0;
      overhead += rolling[i]?.overheadCost ?? 0;
      budgetSales += data.budget[i]?.salesCost ?? 0;
      budgetOpex += data.budget[i]?.operatingCost ?? 0;
      budgetOverhead += data.budget[i]?.overheadCost ?? 0;
    }
    return {
      period: `P${i + 1}`,
      sales: i < periodsCompleted ? sales : null,
      budgetSales,
      opex: i < periodsCompleted ? opex : null,
      budgetOpex,
      overhead: i < periodsCompleted ? overhead : null,
      budgetOverhead,
    };
  });

  const tooltipStyle = {
    contentStyle: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: "10px", fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.08)" },
    labelStyle: { color: "#0F172A", fontWeight: 600, fontSize: 12 },
    itemStyle: { color: "#1E293B" },
    cursor: { fill: "rgba(30,42,94,0.025)" },
    wrapperStyle: { outline: "none" },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-[#1E2A5E]">Overall Expenses (Company-Wide)</h2>
        <span className="text-[10px] text-slate-400 font-medium mt-0.5">Actual vs Budget by period across all services</span>
      </div>

      <div className="spotlight-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Sales Expense: Actual vs Budget</h3>
        <p className="text-[11px] text-slate-400 mb-5">Company-wide sales expense per period</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="period" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: "#E2E8F0" }} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 10 }} />
            <Bar dataKey="budgetSales" fill="rgba(30,58,138,0.15)" name="Budget" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sales" fill="#4338CA" name="Actual" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="spotlight-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Operating Expense: Actual vs Budget</h3>
        <p className="text-[11px] text-slate-400 mb-5">Company-wide operating costs per period</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="period" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: "#E2E8F0" }} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 10 }} />
            <Bar dataKey="budgetOpex" fill="rgba(30,58,138,0.15)" name="Budget" radius={[4, 4, 0, 0]} />
            <Bar dataKey="opex" fill="#065F46" name="Actual" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="spotlight-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Overhead: Actual vs Budget</h3>
        <p className="text-[11px] text-slate-400 mb-5">Company-wide fixed overhead per period</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="period" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#E2E8F0" }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: "#E2E8F0" }} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 10 }} />
            <Bar dataKey="budgetOverhead" fill="rgba(30,58,138,0.15)" name="Budget" radius={[4, 4, 0, 0]} />
            <Bar dataKey="overhead" fill="#B8860B" name="Actual" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
