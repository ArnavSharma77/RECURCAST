"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  NUM_PERIODS, runWhatIf, calcPayback, projectMultiYear,
  fmtCurrency, fmtPct,
} from "@/lib/model";
import type { WhatIfInputs, ClientParameters, PeriodData, StaffType, MultiYearAssumptions } from "@/lib/model";
import { DEMO_PARAMS, getDemoForecast } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase/client";
import { getRollingForecast } from "@/lib/supabase/data";
import type { ClientRow, SavedScenarioRow } from "@/lib/supabase/types";

function getClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )rc_client=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
import { Nav } from "@/components/nav";
import { KpiRow } from "@/components/kpi-cards";
import { ScenarioChart } from "@/components/charts/scenario-chart";
import { PaybackChart } from "@/components/charts/payback-chart";
import { WhatIfSliders } from "@/components/whatif-sliders";
import {
  Lightbulb, RotateCcw, UserPlus, TrendingUp, AlertTriangle,
  ShieldCheck, Loader2, DollarSign, Save, FolderOpen, Trash2,
  Briefcase, Settings2, Calendar,
} from "lucide-react";

interface Preset {
  label: string;
  desc: string;
  icon: React.ReactNode;
  staffCost: number;
  staffStart: number;
  weeklyAvg: number;
  staffType?: StaffType;
  operationsEfficiency?: number;
  cxOverride: number | null;
  servicePricePct?: number;
  servicePriceStart?: number;
  productPricePct?: number;
  productPriceStart?: number;
}

function getPresets(weeklySales: number): Preset[] {
  return [
    { label: "Add Salesperson", desc: `$3.5K base/mo, starts P4, $${weeklySales}/wk`, icon: <UserPlus className="w-3 h-3" />, staffCost: 3500, staffStart: 4, weeklyAvg: weeklySales, staffType: "sales", cxOverride: null },
    { label: "Add Office Staff", desc: "$2.5K/period, admin support", icon: <Briefcase className="w-3 h-3" />, staffCost: 2500, staffStart: 1, weeklyAvg: 0, staffType: "office", cxOverride: null },
    { label: "Add Ops Manager", desc: "$5K/period, reduces expenses 10%", icon: <Settings2 className="w-3 h-3" />, staffCost: 5000, staffStart: 1, weeklyAvg: 0, staffType: "operations", operationsEfficiency: 0.10, cxOverride: null },
    { label: "Boost $50/wk", desc: "No new staff, +$50/wk sales", icon: <TrendingUp className="w-3 h-3" />, staffCost: 0, staffStart: 1, weeklyAvg: 50, staffType: "sales", cxOverride: null },
    { label: "Price Increase 5%", desc: "5% service price bump at P6", icon: <DollarSign className="w-3 h-3" />, staffCost: 0, staffStart: 1, weeklyAvg: 0, cxOverride: null, servicePricePct: 5, servicePriceStart: 6, productPricePct: 0, productPriceStart: 6 },
    { label: "Lower Churn (7%)", desc: "What if CX drops from 10% to 7%?", icon: <ShieldCheck className="w-3 h-3" />, staffCost: 0, staffStart: 1, weeklyAvg: 0, cxOverride: 0.07 },
    { label: "Higher Churn (15%)", desc: "What if CX rises from 10% to 15%?", icon: <AlertTriangle className="w-3 h-3" />, staffCost: 0, staffStart: 1, weeklyAvg: 0, cxOverride: 0.15 },
    { label: "Reset", desc: "Clear all inputs", icon: <RotateCcw className="w-3 h-3" />, staffCost: 0, staffStart: 1, weeklyAvg: 0, cxOverride: null, servicePricePct: 0, servicePriceStart: 6, productPricePct: 0, productPriceStart: 6 },
  ];
}

export default function WhatIfPage() {
  const [liveParams, setLiveParams] = useState<ClientParameters | null>(null);
  const [liveForecast, setLiveForecast] = useState<PeriodData[] | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [weeklySalesRate, setWeeklySalesRate] = useState(200);
  const [staffCost, setStaffCost] = useState(0);
  const [staffStart, setStaffStart] = useState(1);
  const [staffType, setStaffType] = useState<StaffType>("sales");
  const [operationsEfficiency, setOperationsEfficiency] = useState(0.10);
  const [useSameRamp, setUseSameRamp] = useState(true);
  const [sameRampValue, setSameRampValue] = useState(0);
  const [weeklyRamp, setWeeklyRamp] = useState<number[]>(
    Array.from({ length: NUM_PERIODS }, () => 0)
  );
  const [cxOverride, setCxOverride] = useState<number | null>(null);
  const [commissionPct, setCommissionPct] = useState(0);
  const [servicePricePct, setServicePricePct] = useState(0);
  const [servicePriceStart, setServicePriceStart] = useState(1);
  const [productPricePct, setProductPricePct] = useState(0);
  const [productPriceStart, setProductPriceStart] = useState(1);

  // Save/Load state
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioRow[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Multi-year state
  const [showMultiYear, setShowMultiYear] = useState(false);
  const [myAssumptions, setMyAssumptions] = useState<MultiYearAssumptions>({
    annualRevenueGrowth: 0.10,
    annualExpenseGrowth: 0.05,
    addStaffYear2: false,
    staffCostY2: 3500,
    staffStartY2: 1,
    weeklyRampY2: 200,
    addStaffYear3: false,
    staffCostY3: 3500,
    staffStartY3: 1,
    weeklyRampY3: 200,
    priceIncreaseY2: 0,
    priceIncreaseY3: 0,
  });

  const applyPreset = useCallback((p: Preset) => {
    setStaffCost(p.staffCost);
    setStaffStart(p.staffStart);
    setSameRampValue(p.weeklyAvg);
    setUseSameRamp(true);
    setCxOverride(p.cxOverride);
    if (p.staffType) setStaffType(p.staffType);
    if (p.operationsEfficiency !== undefined) setOperationsEfficiency(p.operationsEfficiency);
    const start = p.staffCost > 0 ? p.staffStart : 1;
    setWeeklyRamp(
      Array.from({ length: NUM_PERIODS }, (_, i) => (i + 1) >= start ? p.weeklyAvg : 0)
    );
    if (p.servicePricePct !== undefined) setServicePricePct(p.servicePricePct);
    if (p.servicePriceStart !== undefined) setServicePriceStart(p.servicePriceStart);
    if (p.productPricePct !== undefined) setProductPricePct(p.productPricePct);
    if (p.productPriceStart !== undefined) setProductPriceStart(p.productPriceStart);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const cid = getClientId();
        setClientId(cid);
        if (!cid) { setDataReady(true); return; }
        const { data: client } = await supabase
          .from("clients").select("*").eq("id", cid).single();
        if (!client) { setDataReady(true); return; }
        const c = client as ClientRow;
        const rate = Number(c.weekly_sales_rate) || 200;
        setWeeklySalesRate(rate);
        const p: ClientParameters = {
          locationName: c.name, fiscalYear: c.fiscal_year, periodsCompleted: c.periods_completed,
          cxRate: Number(c.cx_rate), avgServicePrice: 0, tripChargePerCust: 0,
          allocWin: 0, allocRef: 0, allocSan: 0, instRateWin: 0, instRateRef: 0, instRateSan: 0,
          commissionRate: Number(c.commission_rate),
        };
        setLiveParams(p);
        const fc = await getRollingForecast(c.id, c.periods_completed);
        setLiveForecast(fc);

        // Load saved scenarios
        const { data: scenarios } = await supabase
          .from("saved_scenarios")
          .select("*")
          .eq("client_id", cid)
          .eq("scope", "company")
          .order("created_at", { ascending: false });
        if (scenarios) setSavedScenarios(scenarios as SavedScenarioRow[]);
      } catch { /* fallback to demo */ } finally {
        setDataReady(true);
      }
    }
    load();
  }, []);

  const params = liveParams ?? DEMO_PARAMS;
  const PRESETS = useMemo(() => getPresets(weeklySalesRate), [weeklySalesRate]);
  const forecast = useMemo(() => liveForecast ?? getDemoForecast(), [liveForecast]);
  const agpPct = useMemo(() => {
    const totalRev = forecast.reduce((s, p) => s + p.totalIncome, 0);
    const totalAGP = forecast.reduce((s, p) => s + p.adjGrossProfit, 0);
    return totalRev > 0 ? totalAGP / totalRev : 0;
  }, [forecast]);

  const whatIfInputs: WhatIfInputs = {
    weeklyRamp, staffCost, staffStart, staffType, operationsEfficiency,
    cxOverride,
    priceIncrease: (servicePricePct > 0 || productPricePct > 0) ? {
      servicePct: servicePricePct / 100,
      serviceStartPeriod: servicePriceStart,
      productPct: productPricePct / 100,
      productStartPeriod: productPriceStart,
    } : undefined,
  };

  const effectiveCommission = commissionPct / 100;
  const scenarioParams = useMemo(() => ({ ...params, commissionRate: effectiveCommission }), [params, effectiveCommission]);

  const result = useMemo(
    () => runWhatIf(forecast, whatIfInputs, scenarioParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forecast, weeklyRamp, staffCost, staffStart, staffType, operationsEfficiency, cxOverride, servicePricePct, servicePriceStart, productPricePct, productPriceStart, scenarioParams]
  );

  const payback = useMemo(
    () => calcPayback(result, agpPct, staffCost, staffStart, params.periodsCompleted, effectiveCommission),
    [result, agpPct, staffCost, staffStart, params.periodsCompleted, effectiveCommission]
  );

  const multiYearResult = useMemo(
    () => showMultiYear ? projectMultiYear(forecast, result, params, myAssumptions) : null,
    [showMultiYear, forecast, result, params, myAssumptions]
  );

  const totalRevenueImpact = result.incomeDiff.reduce((s, v) => s + v, 0);
  const totalCOGSImpact = result.cogsDiff.reduce((s, v) => s + v, 0);
  const totalExpenseImpact = result.expenseDiff.reduce((s, v) => s + v, 0);
  const totalNetImpact = result.netDiff.reduce((s, v) => s + v, 0);
  const baseAnnualRev = result.baseIncome.reduce((s, v) => s + v, 0);
  const y1End = NUM_PERIODS - 1;
  const hasStaffCost = staffCost > 0;
  const annualROI = hasStaffCost
    ? (payback.cumAGP[y1End] - payback.cumCost[y1End]) / payback.cumCost[y1End]
    : baseAnnualRev > 0 ? totalNetImpact / baseAnnualRev : 0;

  const revenueChartData = result.baseIncome.map((v, i) => ({
    period: `P${i + 1}`, base: v, scenario: result.scenarioIncome[i],
  }));
  const netChartData = result.baseNetIncome.map((v, i) => ({
    period: `P${i + 1}`, base: v, scenario: result.scenarioNetIncome[i],
  }));
  const paybackChartData = Array.from({ length: NUM_PERIODS }, (_, i) => ({
    period: `P${i + 1}`, cumCost: payback.cumCost[i], cumAGP: payback.cumAGP[i], cumNet: payback.cumNet[i],
  }));

  // Save scenario
  async function handleSave() {
    if (!saveName.trim() || !clientId) return;
    const inputs = {
      staffCost, staffStart, staffType, operationsEfficiency,
      weeklyRamp, cxOverride, commissionPct,
      servicePricePct, servicePriceStart, productPricePct, productPriceStart,
      useSameRamp, sameRampValue,
    };
    const resultsSummary = {
      totalRevenueImpact, totalNetImpact,
      breakevenPeriod: payback.breakevenPeriod,
      roi: annualROI,
    };
    const { data, error } = await supabase.from("saved_scenarios").insert({
      client_id: clientId,
      name: saveName.trim(),
      scope: "company",
      inputs,
      results_summary: resultsSummary,
    }).select().single();
    if (!error && data) {
      setSavedScenarios(prev => [data as SavedScenarioRow, ...prev]);
      setSaveName("");
      setShowSaveDialog(false);
    }
  }

  // Load scenario
  function loadScenario(scenario: SavedScenarioRow) {
    const inp = scenario.inputs as Record<string, unknown>;
    setStaffCost(Number(inp.staffCost) || 0);
    setStaffStart(Number(inp.staffStart) || 1);
    setStaffType((inp.staffType as StaffType) || "sales");
    setOperationsEfficiency(Number(inp.operationsEfficiency) || 0.10);
    setWeeklyRamp((inp.weeklyRamp as number[]) || Array(NUM_PERIODS).fill(0));
    setCxOverride(inp.cxOverride as number | null);
    setCommissionPct(Number(inp.commissionPct) || 0);
    setServicePricePct(Number(inp.servicePricePct) || 0);
    setServicePriceStart(Number(inp.servicePriceStart) || 1);
    setProductPricePct(Number(inp.productPricePct) || 0);
    setProductPriceStart(Number(inp.productPriceStart) || 1);
    setUseSameRamp(Boolean(inp.useSameRamp));
    setSameRampValue(Number(inp.sameRampValue) || 0);
    setShowSaved(false);
  }

  // Delete scenario
  async function deleteScenario(id: string) {
    await supabase.from("saved_scenarios").delete().eq("id", id);
    setSavedScenarios(prev => prev.filter(s => s.id !== id));
  }

  if (!dataReady) {
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">What-If Scenario Builder</h2>
            <p className="text-xs text-slate-500 mt-1">
              {params.locationName} &middot; FY{params.fiscalYear} &middot; {params.periodsCompleted} periods completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Saved ({savedScenarios.length})
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs text-indigo-900 font-medium transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={() => setShowMultiYear(!showMultiYear)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                showMultiYear
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              3-Year
            </button>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Save Scenario</h3>
            <input
              type="text"
              placeholder="Scenario name..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-4"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveDialog(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={!saveName.trim()} className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-900 rounded-lg hover:bg-indigo-800 disabled:opacity-40 cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Scenarios Panel */}
      {showSaved && savedScenarios.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Saved Scenarios</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {savedScenarios.map(sc => {
                const summary = sc.results_summary as Record<string, unknown>;
                return (
                  <div key={sc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors">
                    <button onClick={() => loadScenario(sc)} className="text-left flex-1 cursor-pointer">
                      <span className="text-xs font-semibold text-slate-800 block">{sc.name}</span>
                      <span className="text-[10px] text-slate-500">
                        Rev: {fmtCurrency(Number(summary.totalRevenueImpact) || 0)} · Net: {fmtCurrency(Number(summary.totalNetImpact) || 0)}
                      </span>
                    </button>
                    <button onClick={() => deleteScenario(sc.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Quick scenarios</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => applyPreset(p)}
                className="group flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200
                  hover:border-indigo-300/30 bg-slate-50/50 hover:bg-indigo-50
                  transition-all duration-200 text-xs cursor-pointer"
                title={p.desc}
              >
                <span className="text-slate-500 group-hover:text-indigo-900 transition-colors duration-200">{p.icon}</span>
                <span className="text-slate-700 group-hover:text-indigo-900 font-medium transition-colors duration-200">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <KpiRow
          cards={[
            { label: `Revenue Impact (P${params.periodsCompleted + 1}–P${NUM_PERIODS})`, value: fmtCurrency(totalRevenueImpact), sublabel: `Additional revenue over ${NUM_PERIODS - params.periodsCompleted} remaining periods`, positive: totalRevenueImpact === 0 ? null : totalRevenueImpact > 0 },
            { label: `Net Income Impact (P${params.periodsCompleted + 1}–P${NUM_PERIODS})`, value: fmtCurrency(totalNetImpact), sublabel: `After auto-scaled costs, ${NUM_PERIODS - params.periodsCompleted} periods`, positive: totalNetImpact === 0 ? null : totalNetImpact > 0 },
            { label: "Breakeven Period", value: !hasStaffCost
              ? "N/A"
              : payback.breakevenPeriod
                ? payback.breakevenPeriod <= NUM_PERIODS
                  ? `Period ${payback.breakevenPeriod}`
                  : `Y2 Period ${payback.breakevenPeriod - NUM_PERIODS}`
                : "Not reached",
              sublabel: !hasStaffCost
                ? "No staff cost to recover"
                : payback.breakevenPeriod
                  ? payback.breakevenPeriod <= NUM_PERIODS
                    ? "When AGP covers staff cost"
                    : "Breakeven in next fiscal year"
                  : "Not reached within 2 years",
              positive: !hasStaffCost ? null : payback.breakevenPeriod !== null },
            { label: hasStaffCost ? "Staff ROI (thru P13)" : "Revenue Uplift %", value: fmtPct(annualROI), sublabel: hasStaffCost ? `Return on staff cost thru end of FY · AGP: ${fmtPct(agpPct)}` : `AGP Margin: ${fmtPct(agpPct)}`, positive: annualROI === 0 ? null : annualROI > 0 },
          ]}
        />

        {/* Cost auto-scaling breakdown */}
        {totalRevenueImpact !== 0 && (() => {
          const baseSalaryTotal = staffCost * Math.max(0, NUM_PERIODS - Math.max(staffStart, params.periodsCompleted + 1) + 1);
          const commissionTotal = totalRevenueImpact > 0 ? totalRevenueImpact * effectiveCommission : 0;
          const varExpenseOnly = totalExpenseImpact - baseSalaryTotal - commissionTotal;
          const totalCostImpact = totalCOGSImpact + totalExpenseImpact;
          return (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Auto-scaled costs
              </span>
              <span className="text-slate-700">COGS <strong className={`tabular-nums ${totalCOGSImpact >= 0 ? "text-red-500" : "text-emerald-600"}`}>{fmtCurrency(totalCOGSImpact)}</strong></span>
              <span className="text-slate-700">Route/Tech <strong className={`tabular-nums ${varExpenseOnly >= 0 ? "text-red-500" : "text-emerald-600"}`}>{fmtCurrency(varExpenseOnly)}</strong></span>
              {baseSalaryTotal > 0 && <span className="text-slate-700">Base Salary <strong className="text-red-500 tabular-nums">{fmtCurrency(baseSalaryTotal)}</strong></span>}
              {commissionTotal > 0 && <span className="text-slate-700">Commission ({commissionPct}%) <strong className="text-red-500 tabular-nums">{fmtCurrency(commissionTotal)}</strong></span>}
              {staffType === "operations" && operationsEfficiency > 0 && (
                <span className="text-slate-700">Ops Savings <strong className="text-emerald-600 tabular-nums">{fmtCurrency(result.baseExpense.slice(params.periodsCompleted).reduce((s, v) => s + v * operationsEfficiency, 0))}</strong></span>
              )}
              <span className="text-slate-900/10">|</span>
              <span className="text-slate-700">Total <strong className={`tabular-nums ${totalCostImpact >= 0 ? "text-red-500" : "text-emerald-600"}`}>{fmtCurrency(totalCostImpact)}</strong></span>
            </div>
          );
        })()}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <WhatIfSliders
              weeklyRamp={weeklyRamp} staffCost={staffCost} staffStart={staffStart}
              staffType={staffType} operationsEfficiency={operationsEfficiency}
              cxOverride={cxOverride} useSameRamp={useSameRamp} sameRampValue={sameRampValue}
              commissionPct={commissionPct}
              servicePricePct={servicePricePct} servicePriceStart={servicePriceStart}
              productPricePct={productPricePct} productPriceStart={productPriceStart}
              onWeeklyRampChange={setWeeklyRamp} onStaffCostChange={setStaffCost}
              onStaffStartChange={setStaffStart} onStaffTypeChange={setStaffType}
              onOperationsEfficiencyChange={setOperationsEfficiency}
              onCxOverrideChange={setCxOverride}
              onUseSameRampChange={setUseSameRamp} onSameRampValueChange={setSameRampValue}
              onCommissionPctChange={setCommissionPct}
              onServicePricePctChange={setServicePricePct} onServicePriceStartChange={setServicePriceStart}
              onProductPricePctChange={setProductPricePct} onProductPriceStartChange={setProductPriceStart}
            />
            {/* Summary insight */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Quick Insight</h4>
              {staffCost > 0 && staffType === "sales" ? (
                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                  <p>
                    A salesperson costing <strong>{fmtCurrency(staffCost)}/period</strong> starting
                    in <strong>Period {staffStart}</strong> with <strong>{fmtCurrency(sameRampValue)}/wk</strong> in
                    new sales{cxOverride !== null && cxOverride !== params.cxRate
                      ? <> at <strong className="text-amber-400">{fmtPct(cxOverride)} cancellation rate</strong></>
                      : null
                    } {payback.breakevenPeriod
                      ? payback.breakevenPeriod <= NUM_PERIODS
                        ? <>reaches AGP breakeven by <strong className="text-emerald-600">Period {payback.breakevenPeriod}</strong>.</>
                        : <>reaches AGP breakeven in <strong className="text-emerald-600">Period {payback.breakevenPeriod - NUM_PERIODS} of next fiscal year</strong>.</>
                      : <><strong className="text-amber-400">does not break even</strong> within 2 years.</>
                    }
                  </p>
                  <p className="text-slate-500">
                    Net P&L impact (remaining year): <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong>
                  </p>
                </div>
              ) : staffCost > 0 && staffType === "office" ? (
                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                  <p>
                    Adding office/admin staff at <strong>{fmtCurrency(staffCost)}/period</strong> starting
                    <strong> Period {staffStart}</strong>. Pure overhead cost — no direct revenue generation.
                  </p>
                  <p className="text-slate-500">
                    Net P&L impact: <strong className="text-red-500">{fmtCurrency(totalNetImpact)}</strong>
                  </p>
                </div>
              ) : staffCost > 0 && staffType === "operations" ? (
                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                  <p>
                    An operations manager at <strong>{fmtCurrency(staffCost)}/period</strong> starting
                    <strong> Period {staffStart}</strong> reduces operating expenses by
                    <strong className="text-emerald-600"> {Math.round(operationsEfficiency * 100)}%</strong>.
                  </p>
                  <p className="text-slate-500">
                    Net P&L impact: <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong>
                  </p>
                </div>
              ) : sameRampValue > 0 ? (
                <p className="text-xs text-slate-700 leading-relaxed">
                  Boosting weekly sales by <strong>{fmtCurrency(sameRampValue)}/wk</strong>{cxOverride !== null && cxOverride !== params.cxRate
                    ? <> with <strong className="text-amber-400">{fmtPct(cxOverride)} cancellation</strong></>
                    : null
                  } adds <strong className={totalRevenueImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalRevenueImpact)}</strong> in revenue.
                  After costs: <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong> net.
                </p>
              ) : (servicePricePct > 0 || productPricePct > 0) ? (
                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                  {servicePricePct > 0 && <p>Service price increase of <strong className="text-emerald-600">{servicePricePct}%</strong> starting <strong>Period {servicePriceStart}</strong>.</p>}
                  {productPricePct > 0 && <p>Product price increase of <strong className="text-emerald-600">{productPricePct}%</strong> starting <strong>Period {productPriceStart}</strong>.</p>}
                  <p className="text-slate-500">
                    Net income impact: <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong>.
                  </p>
                </div>
              ) : cxOverride !== null && cxOverride !== params.cxRate ? (
                <p className="text-xs text-slate-700 leading-relaxed">
                  {cxOverride < params.cxRate
                    ? <>Reducing cancellation to <strong className="text-emerald-600">{fmtPct(cxOverride)}</strong> retains more customers.</>
                    : <>Increasing cancellation to <strong className="text-red-500">{fmtPct(cxOverride)}</strong> means higher churn.</>
                  }
                  {" "}Net impact: <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong>.
                </p>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pick a preset or adjust the sliders. Try &quot;Add Salesperson&quot; for breakeven analysis, &quot;Add Ops Manager&quot; to reduce expenses, or &quot;Price Increase&quot; for margin improvement.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <ScenarioChart data={revenueChartData} title="Total Income: Base vs Scenario" periodsCompleted={params.periodsCompleted} />
            <ScenarioChart data={netChartData} title="Net Income: Base vs Scenario" periodsCompleted={params.periodsCompleted} />
            {hasStaffCost && staffType === "sales" && <PaybackChart data={paybackChartData} breakevenPeriod={payback.breakevenPeriod} />}
          </div>
        </div>

        {/* Multi-Year Outlook */}
        {showMultiYear && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-800">3-Year Projection</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Projects forward from current scenario P13 ending state. Year 2 and 3 use growth assumptions below.
            </p>

            {/* Multi-year controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Revenue Growth %/yr</label>
                <input type="number" value={Math.round(myAssumptions.annualRevenueGrowth * 100)} onChange={e => setMyAssumptions(a => ({ ...a, annualRevenueGrowth: Number(e.target.value) / 100 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Expense Growth %/yr</label>
                <input type="number" value={Math.round(myAssumptions.annualExpenseGrowth * 100)} onChange={e => setMyAssumptions(a => ({ ...a, annualExpenseGrowth: Number(e.target.value) / 100 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Price Increase Y2 %</label>
                <input type="number" value={Math.round(myAssumptions.priceIncreaseY2 * 100)} onChange={e => setMyAssumptions(a => ({ ...a, priceIncreaseY2: Number(e.target.value) / 100 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Price Increase Y3 %</label>
                <input type="number" value={Math.round(myAssumptions.priceIncreaseY3 * 100)} onChange={e => setMyAssumptions(a => ({ ...a, priceIncreaseY3: Number(e.target.value) / 100 }))} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg" />
              </div>
            </div>

            {/* Add staff in Y2/Y3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-100 p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={myAssumptions.addStaffYear2} onChange={e => setMyAssumptions(a => ({ ...a, addStaffYear2: e.target.checked }))} className="rounded border-slate-300 text-indigo-900 focus:ring-indigo-200 w-3.5 h-3.5" />
                  <span className="text-xs font-semibold text-slate-700">Add salesperson in Y2</span>
                </label>
                {myAssumptions.addStaffYear2 && (
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-slate-500">Cost/period</span><input type="number" value={myAssumptions.staffCostY2} onChange={e => setMyAssumptions(a => ({ ...a, staffCostY2: Number(e.target.value) }))} className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs mt-0.5" /></div>
                    <div><span className="text-slate-500">Start Period</span><input type="number" min={1} max={13} value={myAssumptions.staffStartY2} onChange={e => setMyAssumptions(a => ({ ...a, staffStartY2: Number(e.target.value) }))} className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs mt-0.5" /></div>
                    <div><span className="text-slate-500">$/wk sales</span><input type="number" value={myAssumptions.weeklyRampY2} onChange={e => setMyAssumptions(a => ({ ...a, weeklyRampY2: Number(e.target.value) }))} className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs mt-0.5" /></div>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-100 p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={myAssumptions.addStaffYear3} onChange={e => setMyAssumptions(a => ({ ...a, addStaffYear3: e.target.checked }))} className="rounded border-slate-300 text-indigo-900 focus:ring-indigo-200 w-3.5 h-3.5" />
                  <span className="text-xs font-semibold text-slate-700">Add salesperson in Y3</span>
                </label>
                {myAssumptions.addStaffYear3 && (
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-slate-500">Cost/period</span><input type="number" value={myAssumptions.staffCostY3} onChange={e => setMyAssumptions(a => ({ ...a, staffCostY3: Number(e.target.value) }))} className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs mt-0.5" /></div>
                    <div><span className="text-slate-500">Start Period</span><input type="number" min={1} max={13} value={myAssumptions.staffStartY3} onChange={e => setMyAssumptions(a => ({ ...a, staffStartY3: Number(e.target.value) }))} className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs mt-0.5" /></div>
                    <div><span className="text-slate-500">$/wk sales</span><input type="number" value={myAssumptions.weeklyRampY3} onChange={e => setMyAssumptions(a => ({ ...a, weeklyRampY3: Number(e.target.value) }))} className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs mt-0.5" /></div>
                  </div>
                )}
              </div>
            </div>

            {/* Year summary cards */}
            {multiYearResult && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {multiYearResult.years.map(yr => (
                  <div key={yr.year} className={`rounded-xl border p-4 ${yr.year === 1 ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-slate-50/30"}`}>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Year {yr.year} {yr.year === 1 ? "(Current)" : "(Projected)"}</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Revenue</span>
                        <span className="font-bold text-slate-900 tabular-nums">{fmtCurrency(yr.totalRevenue, true)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Net Income</span>
                        <span className={`font-bold tabular-nums ${yr.totalNetIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtCurrency(yr.totalNetIncome, true)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Net Margin</span>
                        <span className="font-bold text-slate-900 tabular-nums">{fmtPct(yr.netMargin)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3-year period chart */}
            {multiYearResult && (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex items-end gap-[2px] h-40">
                    {multiYearResult.years.flatMap(yr =>
                      yr.periods.map((p, i) => {
                        const maxRev = Math.max(...multiYearResult.years.flatMap(y => y.periods.map(pp => pp.revenue)));
                        const height = maxRev > 0 ? (p.revenue / maxRev) * 100 : 0;
                        const colors = ["bg-indigo-400", "bg-amber-400", "bg-emerald-400"];
                        return (
                          <div key={`${yr.year}-${i}`} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className={`w-full rounded-t ${colors[yr.year - 1]} opacity-80`}
                              style={{ height: `${height}%` }}
                              title={`Y${yr.year} P${p.period}: ${fmtCurrency(p.revenue)}`}
                            />
                            {(i === 0 || i === 6 || i === 12) && (
                              <span className="text-[8px] text-slate-400">{i === 0 ? `Y${yr.year}` : `P${p.period}`}</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 justify-center text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-400" /> Year 1</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Year 2</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Year 3</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Payback Table */}
        {hasStaffCost && staffType === "sales" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 overflow-x-auto">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Period-by-Period Payback Detail</h3>
            <p className="text-[11px] text-slate-500 mb-4">AGP-based breakeven with 1-period collection delay. Revenue sold in Period X is collected in Period X+1.</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-2 text-left font-medium">Period</th>
                  <th className="py-2.5 px-2 text-right font-medium">Incr. Revenue</th>
                  <th className="py-2.5 px-2 text-right font-medium">AGP Earned</th>
                  <th className="py-2.5 px-2 text-right font-medium">AGP Collected</th>
                  <th className="py-2.5 px-2 text-right font-medium">Staff Cost</th>
                  <th className="py-2.5 px-2 text-right font-medium">Net / Period</th>
                  <th className="py-2.5 px-2 text-right font-medium">Cum Cost</th>
                  <th className="py-2.5 px-2 text-right font-medium">Cum AGP</th>
                  <th className="py-2.5 px-2 text-right font-medium">Cum Net</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: NUM_PERIODS }, (_, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors duration-150 ${
                      payback.breakevenPeriod === i + 1 ? "bg-emerald-500/[0.06]" : ""
                    }`}
                  >
                    <td className="py-2 px-2 font-medium text-slate-700">P{i + 1}</td>
                    <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{fmtCurrency(payback.incRevPerPeriod[i])}</td>
                    <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{fmtCurrency(payback.agpFromRev[i])}</td>
                    <td className="py-2 px-2 text-right text-emerald-600 tabular-nums">{fmtCurrency(payback.agpCollected[i])}</td>
                    <td className="py-2 px-2 text-right text-red-500/80 tabular-nums">{fmtCurrency(payback.costPerPeriod[i])}</td>
                    <td className={`py-2 px-2 text-right font-semibold tabular-nums ${payback.netPerPeriod[i] >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmtCurrency(payback.netPerPeriod[i])}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-500 tabular-nums">{fmtCurrency(payback.cumCost[i])}</td>
                    <td className="py-2 px-2 text-right text-slate-500 tabular-nums">{fmtCurrency(payback.cumAGP[i])}</td>
                    <td className={`py-2 px-2 text-right font-semibold tabular-nums ${payback.cumNet[i] >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmtCurrency(payback.cumNet[i])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
