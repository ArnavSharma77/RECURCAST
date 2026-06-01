"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NUM_PERIODS, fmtCurrency, fmtPct } from "@/lib/model";
import type { PeriodData, ClientParameters } from "@/lib/model";
import { DEMO_PARAMS, DEMO_BUDGET, getDemoForecast, getDemoAvgWeeklyRevPerCust, DEMO_ACTUALS } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase/client";
import { getRollingForecast, getPeriodData } from "@/lib/supabase/data";
import type { ClientRow } from "@/lib/supabase/types";
import { Nav } from "@/components/nav";
import { KpiRow } from "@/components/kpi-cards";
import { RevenueBudgetChart } from "@/components/charts/revenue-budget-chart";
import { VarianceChart } from "@/components/charts/variance-chart";
import { NetProfitChart } from "@/components/charts/net-profit-chart";
import { getDemoServiceData, getRollingServiceForecast } from "@/lib/service-demo-data";
import { ArrowRight, TrendingUp, Percent, DollarSign, Activity, Loader2 } from "lucide-react";

function getClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )rc_client=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface DashboardData {
  params: ClientParameters;
  budget: PeriodData[];
  actuals: PeriodData[];
  forecast: PeriodData[];
  clientName: string;
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noClient, setNoClient] = useState(false);

  useEffect(() => {
    async function load() {
      const clientId = getClientId();
      if (!clientId) { setNoClient(true); setLoading(false); return; }

      try {
        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single();

        if (!client) { setData(fallbackData()); setLoading(false); return; }

        const c = client as ClientRow;
        const periodsCompleted = c.periods_completed;
        const forecast = await getRollingForecast(c.id, periodsCompleted);
        const { budget, actuals } = await getPeriodData(c.id);

        const params: ClientParameters = {
          locationName: c.name,
          fiscalYear: c.fiscal_year,
          periodsCompleted,
          cxRate: Number(c.cx_rate),
          avgServicePrice: 0,
          tripChargePerCust: 0,
          allocWin: 0, allocRef: 0, allocSan: 0,
          instRateWin: 0, instRateRef: 0, instRateSan: 0,
          commissionRate: Number(c.commission_rate),
        };

        setData({ params, budget, actuals, forecast, clientName: c.name });
      } catch {
        setData(fallbackData());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data, loading, noClient };
}

function fallbackData(): DashboardData {
  return {
    params: DEMO_PARAMS,
    budget: DEMO_BUDGET,
    actuals: DEMO_ACTUALS,
    forecast: getDemoForecast(),
    clientName: DEMO_PARAMS.locationName,
  };
}

export default function DashboardPage() {
  const { data, loading, noClient } = useDashboardData();
  const router = useRouter();
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(3);

  useEffect(() => {
    if (noClient) router.replace("/login");
  }, [noClient, router]);

  if (loading || !data || noClient) {
    return (
      <div className="page-ambient min-h-screen text-slate-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-800" />
      </div>
    );
  }

  const { params, budget, actuals, forecast, clientName } = data;
  const pc = params.periodsCompleted;

  const ytdActualIncome = actuals.reduce((s, p) => s + p.totalIncome, 0);
  const ytdBudgetIncome = budget.slice(0, pc).reduce((s, p) => s + p.totalIncome, 0);
  const ytdVariance = ytdActualIncome - ytdBudgetIncome;
  const ytdVariancePct = ytdBudgetIncome > 0 ? ytdVariance / ytdBudgetIncome : 0;

  const ytdActualNI = actuals.reduce((s, p) => s + p.netIncome, 0);
  const ytdBudgetNI = budget.slice(0, pc).reduce((s, p) => s + p.netIncome, 0);
  const ytdNIVariance = ytdActualNI - ytdBudgetNI;

  const annualForecast = forecast.reduce((s, p) => s + p.totalIncome, 0);
  const annualBudget = budget.reduce((s, p) => s + p.totalIncome, 0);
  const annualNetForecast = forecast.reduce((s, p) => s + p.netIncome, 0);
  const annualBudgetNI = budget.reduce((s, p) => s + p.netIncome, 0);

  const totalRev = forecast.reduce((s, p) => s + p.totalIncome, 0);
  const totalAGP = forecast.reduce((s, p) => s + p.adjGrossProfit, 0);
  const agpPct = totalRev > 0 ? totalAGP / totalRev : 0;

  const p13Revenue = forecast[NUM_PERIODS - 1]?.totalIncome ?? 0;
  const yearEndRunRate = p13Revenue * NUM_PERIODS;

  const avgWeeklyRevPerCust = getDemoAvgWeeklyRevPerCust();

  const revenueChartData = Array.from({ length: NUM_PERIODS }, (_, i) => ({
    period: `P${i + 1}`,
    budget: budget[i]?.totalIncome ?? 0,
    actual: i < pc ? (actuals[i]?.totalIncome ?? null) : null,
    forecast: forecast[i]?.totalIncome ?? 0,
    variance: i < pc ? (actuals[i]?.totalIncome ?? 0) - (budget[i]?.totalIncome ?? 0) : 0,
  }));

  const varianceData = Array.from({ length: pc }, (_, i) => ({
    period: `P${i + 1}`,
    variance: (actuals[i]?.netIncome ?? 0) - (budget[i]?.netIncome ?? 0),
    pct: (budget[i]?.netIncome ?? 0) !== 0
      ? (((actuals[i]?.netIncome ?? 0) - (budget[i]?.netIncome ?? 0)) / Math.abs(budget[i]?.netIncome ?? 1)) * 100
      : 0,
  }));

  let cumulativeIncome = 0;
  let cumulativeNetIncome = 0;
  const netProfitData = Array.from({ length: NUM_PERIODS }, (_, i) => {
    const p = forecast[i];
    const income = p?.totalIncome ?? 0;
    const ni = p?.netIncome ?? 0;
    cumulativeIncome += income;
    cumulativeNetIncome += ni;
    return {
      period: `P${i + 1}`,
      profitPct: income > 0 ? ni / income : 0,
      rollingYtdPct: cumulativeIncome > 0 ? cumulativeNetIncome / cumulativeIncome : 0,
      isActual: i < pc,
    };
  });

  const ytdNetProfitPct = ytdActualIncome > 0 ? ytdActualNI / ytdActualIncome : 0;

  const oneOffData = getDemoServiceData(pc).oneoffs;
  const oneOffRolling = getRollingServiceForecast(oneOffData.actuals, oneOffData.forecast, pc);
  const ytdOneOffActual = oneOffRolling.slice(0, pc).reduce((s, p) => s + p.revenue, 0);
  const ytdOneOffBudget = oneOffData.budget.slice(0, pc).reduce((s, p) => s + p.revenue, 0);
  const ytdOneOffVariance = ytdOneOffActual - ytdOneOffBudget;

  return (
    <div className="page-ambient min-h-screen">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-xl text-slate-900 tracking-tight">{clientName}</h2>
            <p className="text-[0.8125rem] text-slate-400 mt-1">
              FY{params.fiscalYear} &middot; {pc} of {NUM_PERIODS} periods completed
            </p>
          </div>
          <Link
            href="/whatif"
            className="btn-secondary group text-[0.8125rem]"
          >
            Run a What-If scenario
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        <KpiRow
          cards={[
            {
              label: "YTD Revenue",
              value: fmtCurrency(ytdActualIncome),
              sublabel: `Bud: ${fmtCurrency(ytdBudgetIncome)} \u00B7 Var: ${fmtCurrency(ytdVariance)} (${ytdVariancePct >= 0 ? "+" : ""}${fmtPct(ytdVariancePct)})`,
              positive: ytdVariance >= 0,
            },
            {
              label: "Annual Rev Forecast",
              value: fmtCurrency(annualForecast),
              sublabel: `Bud: ${fmtCurrency(annualBudget)} \u00B7 Var: ${fmtCurrency(annualForecast - annualBudget)}`,
              positive: annualForecast >= annualBudget,
            },
            {
              label: "YTD Net Income",
              value: fmtCurrency(ytdActualNI),
              sublabel: `Bud: ${fmtCurrency(ytdBudgetNI)} \u00B7 Var: ${fmtCurrency(ytdNIVariance)}${ytdBudgetNI !== 0 ? ` (${ytdNIVariance >= 0 ? "+" : ""}${fmtPct(ytdNIVariance / Math.abs(ytdBudgetNI))})` : ""}`,
              positive: ytdNIVariance >= 0,
            },
            {
              label: "Annual NI Forecast",
              value: fmtCurrency(annualNetForecast),
              sublabel: `Bud: ${fmtCurrency(annualBudgetNI)} \u00B7 Var: ${fmtCurrency(annualNetForecast - annualBudgetNI)}`,
              positive: annualNetForecast >= annualBudgetNI,
            },
          ]}
        />

        <RevenueBudgetChart data={revenueChartData} periodsCompleted={pc} />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard icon={<Percent className="w-4 h-4 text-indigo-800" />} label="AGP Margin" value={fmtPct(agpPct)} />
          <MetricCard icon={<Activity className="w-4 h-4 text-indigo-800" />} label="CX Rate" value={fmtPct(params.cxRate)} />
          <MetricCard icon={<DollarSign className="w-4 h-4 text-indigo-800" />} label="Avg Wkly Rev/Cust" value={fmtCurrency(Math.round(avgWeeklyRevPerCust))} sublabel="Excl. one-offs" />
          <MetricCard icon={<DollarSign className="w-4 h-4 text-indigo-800" />} label="Period Avg Rev" value={fmtCurrency(Math.round(annualForecast / NUM_PERIODS))} />
          <MetricCard icon={<TrendingUp className="w-4 h-4 text-indigo-800" />} label="Year-End Run Rate" value={fmtCurrency(yearEndRunRate)} sublabel={`P${NUM_PERIODS} \u00D7 ${NUM_PERIODS}`} />
        </div>

        <VarianceChart data={varianceData} />

        <NetProfitChart data={netProfitData} ytdPct={ytdNetProfitPct} periodsCompleted={pc} />

        <div className="spotlight-card p-5 sm:p-6">
          <h3 className="text-sm font-medium text-slate-900 mb-1">One-Off Revenue</h3>
          <p className="text-[0.6875rem] text-slate-400 mb-5">Non-recurring revenue excluded from Avg Weekly Rev/Cust</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="border-t border-slate-200 pt-3">
              <p className="text-[0.6875rem] text-slate-400 uppercase tracking-[0.12em] mb-1.5">YTD Actual</p>
              <p className="font-semibold text-lg text-slate-900 tabular-nums">{fmtCurrency(ytdOneOffActual)}</p>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-[0.6875rem] text-slate-400 uppercase tracking-[0.12em] mb-1.5">YTD Budget</p>
              <p className="font-semibold text-lg text-slate-900 tabular-nums">{fmtCurrency(ytdOneOffBudget)}</p>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-[0.6875rem] text-slate-400 uppercase tracking-[0.12em] mb-1.5">Variance</p>
              <p className={`font-semibold text-lg tabular-nums ${ytdOneOffVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtCurrency(ytdOneOffVariance)}</p>
            </div>
          </div>
        </div>

        {/* Period Range Review (EOS Quarterly) */}
        <PeriodRangeReview
          forecast={forecast}
          budget={budget}
          actuals={actuals}
          pc={pc}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          setRangeStart={setRangeStart}
          setRangeEnd={setRangeEnd}
        />

        <div className="spotlight-card p-5 sm:p-6 overflow-x-auto">
          <h3 className="text-sm font-medium text-slate-900 mb-1">Period Detail (Rolling Forecast)</h3>
          <p className="text-[0.6875rem] text-slate-400 mb-5">Shaded rows show actual results. Remaining periods use the forecast.</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="py-2.5 px-2 text-left font-medium">Period</th>
                <th className="py-2.5 px-2 text-left font-medium">Type</th>
                <th className="py-2.5 px-2 text-right font-medium">Total Income</th>
                <th className="py-2.5 px-2 text-right font-medium">COGS</th>
                <th className="py-2.5 px-2 text-right font-medium">Gross Profit</th>
                <th className="py-2.5 px-2 text-right font-medium">Expenses</th>
                <th className="py-2.5 px-2 text-right font-medium">Net Income</th>
                <th className="py-2.5 px-2 text-right font-medium">AGP</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((p, i) => (
                <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 ${i < pc ? "bg-emerald-50/60" : ""}`}>
                  <td className="py-2 px-2 font-medium text-slate-700">P{i + 1}</td>
                  <td className="py-2 px-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i < pc ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-900"}`}>
                      {i < pc ? "Actual" : "Forecast"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{fmtCurrency(p.totalIncome)}</td>
                  <td className="py-2 px-2 text-right text-red-500 tabular-nums">{fmtCurrency(p.totalCOGS)}</td>
                  <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{fmtCurrency(p.grossProfit)}</td>
                  <td className="py-2 px-2 text-right text-red-500 tabular-nums">{fmtCurrency(p.totalExpense)}</td>
                  <td className={`py-2 px-2 text-right font-semibold tabular-nums ${p.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {fmtCurrency(p.netIncome)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400 tabular-nums">{fmtCurrency(p.adjGrossProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 pt-4 px-1">
          <p className="text-[0.6875rem] text-slate-400 leading-relaxed">
            <span className="text-slate-600 font-medium">AGP (Adjusted Gross Profit)</span> = Gross Profit - Franchise Fees (13%) - Route/Tech Labor (24%) - Vehicle Expense.
            AGP Margin is AGP as a percentage of Total Revenue. <span className="text-slate-600 font-medium">Avg Weekly Rev/Cust</span> excludes one-off service revenue.
          </p>
        </div>
      </main>
    </div>
  );
}

function PeriodRangeReview({
  forecast, budget, actuals, pc, rangeStart, rangeEnd, setRangeStart, setRangeEnd,
}: {
  forecast: PeriodData[]; budget: PeriodData[]; actuals: PeriodData[];
  pc: number; rangeStart: number; rangeEnd: number;
  setRangeStart: (v: number) => void; setRangeEnd: (v: number) => void;
}) {
  const start = Math.max(0, rangeStart - 1);
  const end = Math.min(NUM_PERIODS, rangeEnd);
  const rangeForecasts = forecast.slice(start, end);
  const rangeBudgets = budget.slice(start, end);
  const rangeActuals = actuals.slice(start, Math.min(end, pc));

  const rangeRevenue = rangeForecasts.reduce((s, p) => s + p.totalIncome, 0);
  const rangeBudgetRev = rangeBudgets.reduce((s, p) => s + p.totalIncome, 0);
  const rangeRevVariance = rangeRevenue - rangeBudgetRev;

  const rangeNI = rangeForecasts.reduce((s, p) => s + p.netIncome, 0);
  const rangeBudgetNI = rangeBudgets.reduce((s, p) => s + p.netIncome, 0);
  const rangeNIVariance = rangeNI - rangeBudgetNI;

  const rangeAGP = rangeForecasts.reduce((s, p) => s + p.adjGrossProfit, 0);
  const rangeAGPPct = rangeRevenue > 0 ? rangeAGP / rangeRevenue : 0;
  const rangeNetProfitPct = rangeRevenue > 0 ? rangeNI / rangeRevenue : 0;

  const hasActuals = rangeActuals.length > 0;
  const allActual = end <= pc;

  return (
    <div className="spotlight-card p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Period Range Review</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Select a range for quarterly/EOS review sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400">From</label>
          <select
            value={rangeStart}
            onChange={e => { const v = Number(e.target.value); setRangeStart(v); if (v > rangeEnd) setRangeEnd(v); }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-900/20"
          >
            {Array.from({ length: NUM_PERIODS }, (_, i) => (
              <option key={i} value={i + 1} className="bg-white">P{i + 1}</option>
            ))}
          </select>
          <label className="text-[11px] text-slate-400">To</label>
          <select
            value={rangeEnd}
            onChange={e => { const v = Number(e.target.value); setRangeEnd(v); if (v < rangeStart) setRangeStart(v); }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-900/20"
          >
            {Array.from({ length: NUM_PERIODS }, (_, i) => (
              <option key={i} value={i + 1} className="bg-white">P{i + 1}</option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 ml-1">
            {allActual ? "(Actuals)" : hasActuals ? "(Mixed)" : "(Forecast)"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mb-1.5">Revenue</p>
          <p className="text-base font-bold text-slate-900 tabular-nums">{fmtCurrency(rangeRevenue)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Budget: {fmtCurrency(rangeBudgetRev)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mb-1.5">Rev Variance</p>
          <p className={`text-base font-bold tabular-nums ${rangeRevVariance >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtCurrency(rangeRevVariance)}</p>
          <p className="text-[10px] text-slate-500 mt-1">{rangeBudgetRev > 0 ? `${(rangeRevVariance / rangeBudgetRev * 100).toFixed(1)}% vs budget` : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mb-1.5">Net Income</p>
          <p className={`text-base font-bold tabular-nums ${rangeNI >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtCurrency(rangeNI)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Var: {fmtCurrency(rangeNIVariance)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mb-1.5">AGP Margin</p>
          <p className="text-base font-bold text-slate-900 tabular-nums">{fmtPct(rangeAGPPct)}</p>
          <p className="text-[10px] text-slate-500 mt-1">AGP: {fmtCurrency(rangeAGP)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] mb-1.5">Net Profit %</p>
          <p className={`text-base font-bold tabular-nums ${rangeNetProfitPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>{(rangeNetProfitPct * 100).toFixed(1)}%</p>
          <p className="text-[10px] text-slate-500 mt-1">P{rangeStart}-P{rangeEnd} ({end - start} periods)</p>
        </div>
      </div>
    </div>
  );
}


function MetricCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel?: string }) {
  return (
    <div className="spotlight-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] leading-tight">{label}</span>
      </div>
      <span className="text-lg font-bold text-slate-900 tabular-nums">{value}</span>
      {sublabel && <span className="text-[10px] text-slate-500">{sublabel}</span>}
    </div>
  );
}
