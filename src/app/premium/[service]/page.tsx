"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { fmtCurrency, fmtPct } from "@/lib/model";
import { SERVICES, type ServiceName, type ServicePeriodData, getServiceLabel, getServiceColor } from "@/lib/services";
import { getClientServiceData, getRollingServiceForecast } from "@/lib/service-data";
import { supabase } from "@/lib/supabase/client";
import type { ClientRow } from "@/lib/supabase/types";
import { ArrowLeft, Loader2, DatabaseZap, TrendingUp } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, PieChart, Pie, Cell,
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
  franchiseFee: "#7C3AED",
  routeLabor: "#DC2626",
  vehicle: "#EA580C",
  sales: "#4338CA",
  opex: "#065F46",
  overhead: "#B8860B",
};

const COST_COLORS = [
  "#1E3A8A", "#4338CA", "#7C3AED", "#DC2626",
  "#EA580C", "#065F46", "#B8860B",
];

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
  const [noData, setNoData] = useState(false);

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

      const allData = await getClientServiceData(clientId);
      if (!allData || !allData[serviceKey]) {
        setNoData(true);
        setLoading(false);
        return;
      }

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

  if (noData) {
    return (
      <div className="page-ambient min-h-screen text-slate-900">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-5">
            <DatabaseZap className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Data Not Yet Loaded</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            No data available for this service. Your administrator will load financial data during onboarding.
          </p>
          <Link href="/premium" className="text-sm text-indigo-700 font-medium hover:underline">
            &larr; Back to Premium Analytics
          </Link>
        </div>
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
  const ytdLabor = ytdActuals.reduce((s, p) => s + p.laborCost, 0);
  const ytdCOGS = ytdActuals.reduce((s, p) => s + p.cogs, 0);
  const ytdNetIncome = ytdActuals.reduce((s, p) => s + p.netIncome, 0);
  const ytdBudgetNI = ytdBudget.reduce((s, p) => s + p.netIncome, 0);
  const netMargin = ytdRev > 0 ? ytdNetIncome / ytdRev : 0;

  // P&L summary for YTD
  const ytdFranchiseFee = ytdActuals.reduce((s, p) => s + p.franchiseFee, 0);
  const ytdRouteLabor = ytdActuals.reduce((s, p) => s + p.routeLabor, 0);
  const ytdVehicle = ytdActuals.reduce((s, p) => s + p.vehicleExpense, 0);
  const ytdGP = ytdActuals.reduce((s, p) => s + p.grossProfit, 0);

  // Net margin % by period (actual vs budget)
  // Forecast line: only shows for periods after actuals end (diverges from actual)
  const netMarginPctChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted && p.revenue > 0 ? (p.netIncome / p.revenue) * 100 : null,
    budget: budget[i] && budget[i].revenue > 0 ? (budget[i].netIncome / budget[i].revenue) * 100 : 0,
    forecast: i >= periodsCompleted && forecast[i] && forecast[i].revenue > 0
      ? (forecast[i].netIncome / forecast[i].revenue) * 100
      : (i === periodsCompleted - 1 && actuals[i] && actuals[i].revenue > 0)
        ? (actuals[i].netIncome / actuals[i].revenue) * 100
        : null,
  }));

  const revenueChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.revenue : null,
    budget: budget[i]?.revenue ?? 0,
    forecast: i >= periodsCompleted - 1 ? (i < periodsCompleted ? p.revenue : (forecast[i]?.revenue ?? 0)) : null,
  }));

  const laborChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.laborCost : null,
    forecast: i >= periodsCompleted - 1 ? (i < periodsCompleted ? p.laborCost : (forecast[i]?.laborCost ?? 0)) : null,
    pctOfRev: p.revenue > 0 ? (p.laborCost / p.revenue) * 100 : 0,
  }));

  const cogsChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.cogs : null,
    budget: budget[i]?.cogs ?? 0,
  }));

  // Per-period net income chart
  const netIncomeChartData = rolling.map((p, i) => ({
    period: `P${i + 1}`,
    actual: i < periodsCompleted ? p.netIncome : null,
    budget: budget[i]?.netIncome ?? 0,
    forecast: i >= periodsCompleted - 1 ? (i < periodsCompleted ? p.netIncome : (forecast[i]?.netIncome ?? 0)) : null,
  }));

  // Cost allocation pie chart
  const costPieData = [
    { name: "COGS", value: ytdCOGS, color: PALETTE.cogs },
    { name: "Franchise Fee", value: ytdFranchiseFee, color: PALETTE.franchiseFee },
    { name: "Route Labor", value: ytdRouteLabor, color: PALETTE.routeLabor },
    { name: "Vehicle", value: ytdVehicle, color: PALETTE.vehicle },
  ].filter(d => d.value > 0);

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
          <Link
            href={`/premium/${serviceKey}/whatif`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs text-indigo-900 font-medium transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            What-If
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiMini label="YTD Revenue" value={fmtCurrency(ytdRev)} sub={`Var: ${fmtCurrency(ytdRevVar)}`} positive={ytdRevVar >= 0} />
          <KpiMini label="Net Income" value={fmtCurrency(ytdNetIncome)} sub={`Var: ${fmtCurrency(ytdNetIncome - ytdBudgetNI)}`} positive={ytdNetIncome >= ytdBudgetNI} />
          <KpiMini label="Net Margin" value={fmtPct(netMargin)} sub={netMargin >= 0 ? "Profitable" : "Loss"} positive={netMargin >= 0} />
          <KpiMini label="YTD COGS" value={fmtCurrency(ytdCOGS)} sub={`${ytdRev > 0 ? ((ytdCOGS / ytdRev) * 100).toFixed(1) : 0}% of rev`} />
        </div>

        {/* Per-Service P&L Statement */}
        <div className="spotlight-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Service P&L Breakdown</h3>
          <p className="text-[11px] text-slate-500 mb-4">YTD income statement with individual cost allocation &middot; {periodsCompleted} periods</p>

          <div className="flex items-center py-2 px-1 mb-1">
            <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400" />
            <span className="w-24 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Actual</span>
            <span className="w-24 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Budget</span>
            <span className="w-20 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Variance</span>
          </div>

          <div className="space-y-0.5">
            <PLRow label="Revenue" actual={ytdRev} budget={ytdBudgetRev} bold indent={0} />
            <PLRow label="Cost of Goods Sold" actual={ytdCOGS} budget={ytdBudget.reduce((s, p) => s + p.cogs, 0)} indent={1} negative />
            <PLRow label="Gross Profit" actual={ytdGP} budget={ytdBudget.reduce((s, p) => s + p.grossProfit, 0)} bold indent={0} border />

            <div className="pt-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.14em] font-semibold mb-1 pl-1">Cost Deductions</p>
            </div>
            <PLRow label="Franchise Fee (13%)" actual={ytdFranchiseFee} budget={ytdBudget.reduce((s, p) => s + p.franchiseFee, 0)} indent={1} negative />
            <PLRow label="Route/Tech Labor" actual={ytdRouteLabor} budget={ytdBudget.reduce((s, p) => s + p.routeLabor, 0)} indent={1} negative />
            <PLRow label="Vehicle Expense" actual={ytdVehicle} budget={ytdBudget.reduce((s, p) => s + p.vehicleExpense, 0)} indent={1} negative />

            <PLRow label="Net Income" actual={ytdNetIncome} budget={ytdBudgetNI} bold indent={0} border accent />
            <PLRow label="Net Margin" actual={netMargin} budget={ytdBudgetRev > 0 ? ytdBudgetNI / ytdBudgetRev : 0} indent={0} pct />
          </div>
          <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Net Income = Revenue minus service-level costs above. Sales, operating, and overhead are company-wide (see Premium overview).
          </p>
        </div>

        {/* Costs Included Note */}
        <CostsIncludedNote serviceKey={serviceKey} />

        {/* Net Margin % by Period */}
        <ChartPanel title="Net Margin % by Period" subtitle="Actual vs Budget net income as % of revenue with rolling forecast">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={netMarginPctChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <YAxis tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
              <Bar dataKey="budget" fill={PALETTE.budget} name="Budget Net Margin %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill={PALETTE.agpActual} name="Actual Net Margin %" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="forecast" stroke={PALETTE.forecast} strokeWidth={2} dot={{ r: 2.5, fill: PALETTE.forecast }} name="Forecast Net Margin %" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Cost Allocation Pie + Revenue Chart side by side */}
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 spotlight-card p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Cost Allocation</h3>
            <p className="text-[11px] text-slate-500 mb-4">YTD cost breakdown for {label}</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={costPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {costPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtCurrency(Number(v))}
                  contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, color: "#64748B" }}
                  formatter={(value) => <span className="text-[10px] text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-3">
            <ChartPanel title="Revenue: Actual vs Budget vs Forecast" subtitle="Period-level revenue tracking with rolling forecast overlay">
              <ResponsiveContainer width="100%" height={240}>
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
          </div>
        </div>

        {/* Net Income per period */}
        <ChartPanel title="Net Income: Actual vs Budget vs Forecast" subtitle="Per-service profitability by period">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={netIncomeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <YAxis tick={{ fill: CHART_AXIS_TICK, fontSize: 11 }} tickFormatter={(v: number) => fmtCurrency(v, true)} axisLine={{ stroke: CHART_AXIS_LINE }} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748B", paddingTop: 8 }} />
              <Bar dataKey="budget" fill={PALETTE.budget} name="Budget" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#065F46" name="Actual" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="forecast" stroke={PALETTE.forecast} strokeWidth={2} dot={{ r: 2.5, fill: PALETTE.forecast }} name="Forecast" strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>

        <div className="grid lg:grid-cols-2 gap-5">
          <ChartPanel title="Labor Cost: Actual vs Forecast" subtitle="With % of revenue trend">
            <ResponsiveContainer width="100%" height={240}>
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

          <ChartPanel title="COGS: Actual vs Budget" subtitle="Cost of goods sold variance">
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
        </div>

        {/* Full period detail table with all cost categories */}
        <div className="spotlight-card p-5 sm:p-6 overflow-x-auto">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Period Detail — Full P&L</h3>
          <p className="text-[11px] text-slate-500 mb-5">All cost categories by period</p>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="py-2.5 px-2 text-left font-medium">Period</th>
                <th className="py-2.5 px-2 text-left font-medium">Type</th>
                <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                <th className="py-2.5 px-2 text-right font-medium">COGS</th>
                <th className="py-2.5 px-2 text-right font-medium">GP</th>
                <th className="py-2.5 px-2 text-right font-medium">Franch. Fee</th>
                <th className="py-2.5 px-2 text-right font-medium">Route Labor</th>
                <th className="py-2.5 px-2 text-right font-medium">Vehicle</th>
                <th className="py-2.5 px-2 text-right font-medium">Net Income</th>
                <th className="py-2.5 px-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rolling.map((p, i) => {
                const isActual = i < periodsCompleted;
                return (
                  <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50/50 ${isActual ? "bg-indigo-50/30" : ""}`}>
                    <td className="py-2 px-2 font-medium text-slate-700">P{i + 1}</td>
                    <td className="py-2 px-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isActual ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                        {isActual ? "Actual" : "Forecast"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-900 tabular-nums">{fmtCurrency(p.revenue)}</td>
                    <td className="py-2 px-2 text-right text-slate-500 tabular-nums">{fmtCurrency(p.cogs)}</td>
                    <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{fmtCurrency(p.grossProfit)}</td>
                    <td className="py-2 px-2 text-right text-purple-700 tabular-nums">{fmtCurrency(p.franchiseFee)}</td>
                    <td className="py-2 px-2 text-right text-red-700 tabular-nums">{fmtCurrency(p.routeLabor)}</td>
                    <td className="py-2 px-2 text-right text-orange-700 tabular-nums">{fmtCurrency(p.vehicleExpense)}</td>
                    <td className={`py-2 px-2 text-right tabular-nums font-medium ${p.netIncome >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {fmtCurrency(p.netIncome)}
                    </td>
                    <td className={`py-2 px-2 text-right tabular-nums ${p.contributionMargin >= 0 ? "text-slate-600" : "text-red-500"}`}>
                      {(p.contributionMargin * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Navigate to other services */}
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

const COST_NOTES: Record<string, { costs: string[]; formula: string }> = {
  sani: {
    costs: ["COGS (3%)", "Franchise Fee (13%)", "Route/Tech Labor", "Sani Fuel (10% of labor)"],
    formula: "Net Income = Revenue - COGS - Franchise Fee - Route Labor - Sani Fuel",
  },
  windows: {
    costs: ["COGS (2%)", "Franchise Fee (13%)", "Route/Tech Labor (30%)", "Auto Fuel (3% of revenue)"],
    formula: "Net Income = Revenue - COGS - Franchise Fee - Route Labor - Auto Fuel",
  },
  refresh: {
    costs: ["COGS (5%)", "Franchise Fee (13%)", "Route/Tech Labor (20%)"],
    formula: "Net Income = Revenue - COGS - Franchise Fee - Route Labor",
  },
  scrub: {
    costs: ["COGS (1%)", "Franchise Fee (13%)", "Auto Fuel/Repairs", "Route/Tech Labor (23%)"],
    formula: "Net Income = Revenue - COGS - Franchise Fee - Labor - Vehicle",
  },
  nonrestroom: {
    costs: ["COGS (5%)", "Franchise Fee (13%)", "Route/Tech Labor (35%)", "Vehicle (10% of revenue)"],
    formula: "Net Income = Revenue - COGS - Franchise Fee - Route Labor - Vehicle",
  },
  oneoffs: {
    costs: ["Labor (20%)"],
    formula: "Net Income = Revenue - Labor",
  },
};

function CostsIncludedNote({ serviceKey }: { serviceKey: ServiceName }) {
  const note = COST_NOTES[serviceKey];
  if (!note) return null;

  return (
    <div className="spotlight-card p-4 sm:p-5 border-l-[3px] border-l-indigo-400">
      <h4 className="text-xs font-semibold text-slate-700 mb-2">Net Income Definition — {getServiceLabel(serviceKey)}</h4>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {note.costs.map((cost) => (
          <span key={cost} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
            {cost}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 font-mono">{note.formula}</p>
    </div>
  );
}

function PLRow({ label, actual, budget, bold, indent, border, accent, negative, pct }: {
  label: string;
  actual: number;
  budget: number;
  bold?: boolean;
  indent?: number;
  border?: boolean;
  accent?: boolean;
  negative?: boolean;
  pct?: boolean;
}) {
  const variance = actual - budget;
  const pl = indent ? `pl-${indent * 4}` : "";
  const fmt = pct ? fmtPct : fmtCurrency;

  return (
    <div className={`flex items-center py-2 px-1 ${border ? "border-t border-slate-200 mt-1" : ""} ${bold ? "bg-slate-50/50" : ""}`}>
      <span className={`flex-1 text-xs ${bold ? "font-semibold" : "font-normal"} ${accent ? "text-[#1E3A8A]" : "text-slate-700"}`}
        style={{ paddingLeft: (indent ?? 0) * 16 }}
      >
        {label}
      </span>
      <span className={`w-24 text-right text-xs tabular-nums ${bold ? "font-semibold" : ""} ${accent ? "text-[#1E3A8A]" : negative ? "text-slate-600" : "text-slate-900"}`}>
        {fmt(actual)}
      </span>
      <span className="w-24 text-right text-xs tabular-nums text-slate-400">
        {fmt(budget)}
      </span>
      <span className={`w-20 text-right text-xs tabular-nums font-medium ${pct ? (variance >= 0 ? "text-emerald-700" : "text-red-600") : variance >= 0 ? (negative ? "text-red-600" : "text-emerald-700") : (negative ? "text-emerald-700" : "text-red-600")}`}>
        {pct ? `${((actual - budget) * 100).toFixed(1)}pp` : fmtCurrency(variance)}
      </span>
    </div>
  );
}
