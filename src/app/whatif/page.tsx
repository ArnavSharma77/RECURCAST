"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  NUM_PERIODS, runWhatIf, calcPayback,
  fmtCurrency, fmtPct,
} from "@/lib/model";
import type { WhatIfInputs, ClientParameters, PeriodData } from "@/lib/model";
import { DEMO_PARAMS, getDemoForecast } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase/client";
import { getRollingForecast } from "@/lib/supabase/data";
import type { ClientRow } from "@/lib/supabase/types";

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
import { Lightbulb, RotateCcw, UserPlus, TrendingUp, AlertTriangle, ShieldCheck, Loader2, DollarSign } from "lucide-react";

interface Preset {
  label: string;
  desc: string;
  icon: React.ReactNode;
  staffCost: number;
  staffStart: number;
  weeklyAvg: number;
  cxOverride: number | null;
  servicePricePct?: number;
  servicePriceStart?: number;
  productPricePct?: number;
  productPriceStart?: number;
}

function getPresets(weeklySales: number): Preset[] {
  return [
    { label: "Add Salesperson", desc: `$3.5K base/mo, starts P4, $${weeklySales}/wk`, icon: <UserPlus className="w-3 h-3" />, staffCost: 3500, staffStart: 4, weeklyAvg: weeklySales, cxOverride: null },
    { label: "Boost $50/wk", desc: "No new staff, +$50/wk sales", icon: <TrendingUp className="w-3 h-3" />, staffCost: 0, staffStart: 1, weeklyAvg: 50, cxOverride: null },
    { label: `Boost $${weeklySales}/wk`, desc: `No new staff, +$${weeklySales}/wk sales`, icon: <TrendingUp className="w-3 h-3" />, staffCost: 0, staffStart: 1, weeklyAvg: weeklySales, cxOverride: null },
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
  const [staffCost, setStaffCost] = useState(3500);
  const [staffStart, setStaffStart] = useState(4);
  const [useSameRamp, setUseSameRamp] = useState(true);
  const [sameRampValue, setSameRampValue] = useState(200);
  const [weeklyRamp, setWeeklyRamp] = useState<number[]>(
    Array.from({ length: NUM_PERIODS }, (_, i) => (i + 1) >= 4 ? 200 : 0)
  );
  const [cxOverride, setCxOverride] = useState<number | null>(null);
  const [commissionPct, setCommissionPct] = useState(10);
  const [servicePricePct, setServicePricePct] = useState(0);
  const [servicePriceStart, setServicePriceStart] = useState(6);
  const [productPricePct, setProductPricePct] = useState(0);
  const [productPriceStart, setProductPriceStart] = useState(6);

  const applyPreset = useCallback((p: Preset) => {
    setStaffCost(p.staffCost);
    setStaffStart(p.staffStart);
    setSameRampValue(p.weeklyAvg);
    setUseSameRamp(true);
    setCxOverride(p.cxOverride);
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
        const clientId = getClientId();
        if (!clientId) { setDataReady(true); return; }
        const { data: client } = await supabase
          .from("clients").select("*").eq("id", clientId).single();
        if (!client) { setDataReady(true); return; }
        const c = client as ClientRow;
        const rate = Number(c.weekly_sales_rate) || 200;
        setWeeklySalesRate(rate);
        setSameRampValue(rate);
        setWeeklyRamp(Array.from({ length: NUM_PERIODS }, (_, i) => (i + 1) >= 4 ? rate : 0));
        const p: ClientParameters = {
          locationName: c.name, fiscalYear: c.fiscal_year, periodsCompleted: c.periods_completed,
          cxRate: Number(c.cx_rate), avgServicePrice: 0, tripChargePerCust: 0,
          allocWin: 0, allocRef: 0, allocSan: 0, instRateWin: 0, instRateRef: 0, instRateSan: 0,
          commissionRate: Number(c.commission_rate),
        };
        setLiveParams(p);
        const fc = await getRollingForecast(c.id, c.periods_completed);
        setLiveForecast(fc);
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
    weeklyRamp, staffCost, staffStart, cxOverride,
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
    [forecast, weeklyRamp, staffCost, staffStart, cxOverride, servicePricePct, servicePriceStart, productPricePct, productPriceStart, scenarioParams]
  );

  const payback = useMemo(
    () => calcPayback(result, agpPct, staffCost, staffStart, params.periodsCompleted, effectiveCommission),
    [result, agpPct, staffCost, staffStart, params.periodsCompleted, effectiveCommission]
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
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500/70" />
            <span>Pick a preset or adjust sliders. Results update instantly.</span>
          </div>
        </div>
      </div>

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
            { label: "Revenue Impact (Annual)", value: fmtCurrency(totalRevenueImpact), sublabel: "Additional revenue from scenario", positive: totalRevenueImpact === 0 ? null : totalRevenueImpact > 0 },
            { label: "Net Income Impact (Annual)", value: fmtCurrency(totalNetImpact), sublabel: "After auto-scaled costs", positive: totalNetImpact === 0 ? null : totalNetImpact > 0 },
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
            { label: hasStaffCost ? "Staff ROI" : "Revenue Uplift %", value: fmtPct(annualROI), sublabel: `AGP Margin: ${fmtPct(agpPct)}`, positive: annualROI === 0 ? null : annualROI > 0 },
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
              <span className="text-slate-900/10">|</span>
              <span className="text-slate-700">Total <strong className={`tabular-nums ${totalCostImpact >= 0 ? "text-red-500" : "text-emerald-600"}`}>{fmtCurrency(totalCostImpact)}</strong></span>
            </div>
          );
        })()}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-5">
            <WhatIfSliders
              weeklyRamp={weeklyRamp} staffCost={staffCost} staffStart={staffStart}
              cxOverride={cxOverride} useSameRamp={useSameRamp} sameRampValue={sameRampValue}
              commissionPct={commissionPct}
              servicePricePct={servicePricePct} servicePriceStart={servicePriceStart}
              productPricePct={productPricePct} productPriceStart={productPriceStart}
              onWeeklyRampChange={setWeeklyRamp} onStaffCostChange={setStaffCost}
              onStaffStartChange={setStaffStart} onCxOverrideChange={setCxOverride}
              onUseSameRampChange={setUseSameRamp} onSameRampValueChange={setSameRampValue}
              onCommissionPctChange={setCommissionPct}
              onServicePricePctChange={setServicePricePct} onServicePriceStartChange={setServicePriceStart}
              onProductPricePctChange={setProductPricePct} onProductPriceStartChange={setProductPriceStart}
            />
            {/* Summary insight */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Quick Insight</h4>
              {staffCost > 0 ? (
                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                  <p>
                    A salesperson costing <strong>{fmtCurrency(staffCost)}/mo</strong> starting
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
                    Annual P&L impact (after auto-scaled COGS & route costs): <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong>
                  </p>
                </div>
              ) : sameRampValue > 0 ? (
                <p className="text-xs text-slate-700 leading-relaxed">
                  Boosting weekly sales by <strong>{fmtCurrency(sameRampValue)}/wk</strong>{cxOverride !== null && cxOverride !== params.cxRate
                    ? <> with <strong className="text-amber-400">{fmtPct(cxOverride)} cancellation</strong></>
                    : null
                  } adds <strong className={totalRevenueImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalRevenueImpact)}</strong> in revenue.
                  After auto-scaled costs: <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong> net income impact.
                </p>
              ) : (servicePricePct > 0 || productPricePct > 0) ? (
                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                  {servicePricePct > 0 && (
                    <p>
                      Service price increase of <strong className="text-emerald-600">{servicePricePct}%</strong> starting <strong>Period {servicePriceStart}</strong>.
                    </p>
                  )}
                  {productPricePct > 0 && (
                    <p>
                      Product price increase of <strong className="text-emerald-600">{productPricePct}%</strong> starting <strong>Period {productPriceStart}</strong>.
                    </p>
                  )}
                  <p className="text-slate-500">
                    Revenue impact: <strong className={totalRevenueImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalRevenueImpact)}</strong>.
                    Net income impact: <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong>.
                  </p>
                </div>
              ) : cxOverride !== null && cxOverride !== params.cxRate ? (
                <p className="text-xs text-slate-700 leading-relaxed">
                  {cxOverride < params.cxRate
                    ? <>Reducing cancellation from <strong>{fmtPct(params.cxRate)}</strong> to <strong className="text-emerald-600">{fmtPct(cxOverride)}</strong> retains more existing customers.</>
                    : <>Increasing cancellation from <strong>{fmtPct(params.cxRate)}</strong> to <strong className="text-red-500">{fmtPct(cxOverride)}</strong> means higher customer churn.</>
                  }
                  {" "}Revenue impact: <strong className={totalRevenueImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalRevenueImpact)}</strong>.
                  Net income impact: <strong className={totalNetImpact >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtCurrency(totalNetImpact)}</strong>.
                </p>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pick a preset above or adjust the sliders to model a scenario.
                  Try &quot;Add Salesperson&quot; to see breakeven analysis, or &quot;Boost $100/wk&quot; to see revenue impact without hiring.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <ScenarioChart data={revenueChartData} title="Total Income: Base vs Scenario" periodsCompleted={params.periodsCompleted} />
            <ScenarioChart data={netChartData} title="Net Income: Base vs Scenario" periodsCompleted={params.periodsCompleted} />
            {hasStaffCost && <PaybackChart data={paybackChartData} breakevenPeriod={payback.breakevenPeriod} />}
          </div>
        </div>

        {/* Detailed Payback Table */}
        {hasStaffCost && (
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
