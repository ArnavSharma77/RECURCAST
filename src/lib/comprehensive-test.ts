/**
 * Comprehensive scenario test suite for RecurCast.
 * Tests all use cases Warren/clients would exercise,
 * verifies math matches Excel model logic.
 */
import {
  calcRampRevenue, calcAllRampRevenue, calcPayback, runWhatIf,
  calcInstallRevenue, NUM_PERIODS, fmtCurrency, fmtPct,
} from "./model";
import type { WhatIfInputs, PeriodData } from "./model";
import { DEMO_PARAMS, DEMO_BUDGET, DEMO_ACTUALS, getDemoForecast, getDemoAGPPct } from "./demo-data";
import { deriveMetricsFromHistory, generateForecastFromMetrics } from "./historical-calc";

let pass = 0, fail = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) { fail++; console.log(`  FAIL: ${msg}`); }
  else { pass++; console.log(`  PASS: ${msg}`); }
}
function approx(a: number, b: number, tol = 1) { return Math.abs(a - b) <= tol; }
function section(name: string) { console.log(`\n=== ${name} ===`); }

// ── SCENARIO 1: Revenue Model Correctness ──
section("SCENARIO 1: *12/*16 Revenue Model");

const r1 = [100, 150, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
assert(calcRampRevenue(r1, 0) === 1200, "P1: 100*12=1200");
assert(calcRampRevenue(r1, 1) === 3400, "P2: 150*12 + 100*16=3400");
assert(calcRampRevenue(r1, 2) === 6400, "P3: 200*12 + 100*16 + 150*16=6400");
assert(calcRampRevenue(r1, 3) === 7200, "P4: 0*12 + (100+150+200)*16=7200");
assert(calcRampRevenue(r1, 12) === 7200, "P13: same (no new sales after P3)");

// Constant ramp
const constant = Array(13).fill(100);
const p1 = calcRampRevenue(constant, 0);
const p5 = calcRampRevenue(constant, 4);
assert(p1 === 1200, `Constant: P1=${p1} should be 1200`);
assert(p5 === 1200 + 4 * 1600, `Constant: P5=${p5} should be ${1200 + 4*1600}`);

// ── SCENARIO 2: Install Revenue ──
section("SCENARIO 2: Install Revenue (non-additive)");

const inst1 = calcInstallRevenue(500, DEMO_PARAMS);
const exp1 = (500*0.30*2.0 + 500*0.40*0.10 + 500*0.30*0.50) * 4;
assert(approx(inst1, exp1), `500/wk → ${inst1} = ${exp1}`);

const inst2 = calcInstallRevenue(0, DEMO_PARAMS);
assert(inst2 === 0, "Zero sales → zero install");

const inst3 = calcInstallRevenue(1000, DEMO_PARAMS);
assert(approx(inst3, exp1 * 2), "Linear: 1000/wk = 2x of 500/wk");

// ── SCENARIO 3: Warren's Standard Scenario ──
section("SCENARIO 3: Warren's Salesperson ($5K, P4, $200/wk)");

const forecast = getDemoForecast();
const agpPct = getDemoAGPPct();
console.log(`  AGP%: ${(agpPct*100).toFixed(1)}%`);

const warrenInputs: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 200 : 0),
  staffCost: 5000, staffStart: 4, cxOverride: null,
};
const w = runWhatIf(forecast, warrenInputs, DEMO_PARAMS);
const wp = calcPayback(w, agpPct, 5000, 4, DEMO_PARAMS.periodsCompleted);

assert(w.incomeDiff[0] === 0, "P1-P3 (actuals): no income diff");
assert(w.incomeDiff[1] === 0, "P2: no diff");
assert(w.incomeDiff[2] === 0, "P3: no diff");
assert(w.incomeDiff[3] > 0, `P4 income diff: ${fmtCurrency(w.incomeDiff[3])}`);
assert(wp.costPerPeriod[3] === 5000, "P4 cost = $5K");
assert(wp.agpCollected[3] === 0, "P4 AGP collected = 0 (delay)");
assert(wp.agpCollected[4] > 0, `P5 AGP collected: ${fmtCurrency(wp.agpCollected[4])}`);
assert(wp.cumCost[12] === 50000, "Cum cost P13 = $50K (10 periods)");

const totalRevImpact = w.incomeDiff.reduce((s, v) => s + v, 0);
console.log(`  Total revenue impact: ${fmtCurrency(totalRevImpact)}`);
console.log(`  Total net impact: ${fmtCurrency(w.netDiff.reduce((s, v) => s + v, 0))}`);
console.log(`  Breakeven: ${wp.breakevenPeriod ? `P${wp.breakevenPeriod}` : "Not reached"}`);
console.log(`  Year-end cumulative net: ${fmtCurrency(wp.cumNet[12])}`);

// ── SCENARIO 4: Boost Sales Only (No Staff) ──
section("SCENARIO 4: Boost Sales $100/wk (no hire)");

const boostInputs: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, () => 100),
  staffCost: 0, staffStart: 1, cxOverride: null,
};
const b = runWhatIf(forecast, boostInputs, DEMO_PARAMS);
const bp = calcPayback(b, agpPct, 0, 1, DEMO_PARAMS.periodsCompleted);

assert(b.incomeDiff[0] === 0, "P1-3 locked (actuals)");
const boostTotal = b.incomeDiff.reduce((s, v) => s + v, 0);
assert(boostTotal > 0, `Boost adds revenue: ${fmtCurrency(boostTotal)}`);
assert(bp.breakevenPeriod === null, "No breakeven (no cost)");
assert(bp.cumCost[12] === 0, "No cumulative cost");
console.log(`  Revenue impact: ${fmtCurrency(boostTotal)}`);
console.log(`  Net impact: ${fmtCurrency(b.netDiff.reduce((s,v) => s+v, 0))}`);

// ── SCENARIO 5: High CX Rate Impact ──
section("SCENARIO 5: High Cancellation Rate (20%)");

const highCx: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 200 : 0),
  staffCost: 5000, staffStart: 4, cxOverride: 0.20,
};
const hc = runWhatIf(forecast, highCx, DEMO_PARAMS);
const hcp = calcPayback(hc, agpPct, 5000, 4, DEMO_PARAMS.periodsCompleted);

const baseCxResult = runWhatIf(forecast, warrenInputs, DEMO_PARAMS);
const baseCxTotal = baseCxResult.incomeDiff.reduce((s, v) => s + v, 0);
const highCxTotal = hc.incomeDiff.reduce((s, v) => s + v, 0);
assert(highCxTotal < baseCxTotal, `High CX reduces revenue: ${fmtCurrency(highCxTotal)} < ${fmtCurrency(baseCxTotal)}`);
console.log(`  10% CX revenue: ${fmtCurrency(baseCxTotal)}`);
console.log(`  20% CX revenue: ${fmtCurrency(highCxTotal)}`);
console.log(`  Difference: ${fmtCurrency(highCxTotal - baseCxTotal)}`);
console.log(`  Breakeven: ${hcp.breakevenPeriod ? `P${hcp.breakevenPeriod}` : "Not reached"}`);

// ── SCENARIO 6: Aggressive Hire ──
section("SCENARIO 6: Aggressive Hire ($8K, P4, $400/wk)");

const aggInputs: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 400 : 0),
  staffCost: 8000, staffStart: 4, cxOverride: null,
};
const a = runWhatIf(forecast, aggInputs, DEMO_PARAMS);
const ap = calcPayback(a, agpPct, 8000, 4, DEMO_PARAMS.periodsCompleted);

const aggRevTotal = a.incomeDiff.reduce((s, v) => s + v, 0);
const aggNetTotal = a.netDiff.reduce((s, v) => s + v, 0);
assert(aggRevTotal > totalRevImpact, `Agg revenue (${fmtCurrency(aggRevTotal)}) > Warren's (${fmtCurrency(totalRevImpact)})`);
assert(ap.breakevenPeriod !== null, "Should reach breakeven");
console.log(`  Revenue impact: ${fmtCurrency(aggRevTotal)}`);
console.log(`  Net impact: ${fmtCurrency(aggNetTotal)}`);
console.log(`  Breakeven: P${ap.breakevenPeriod}`);
console.log(`  Year-end cum net: ${fmtCurrency(ap.cumNet[12])}`);

const roi = ap.cumCost[12] > 0 ? (ap.cumAGP[12] - ap.cumCost[12]) / ap.cumCost[12] : 0;
console.log(`  ROI: ${fmtPct(roi)}`);

// ── SCENARIO 7: Edge Cases ──
section("SCENARIO 7: Edge Cases");

// Zero everything
const zeroInputs: WhatIfInputs = { weeklyRamp: Array(13).fill(0), staffCost: 0, staffStart: 1, cxOverride: null };
const z = runWhatIf(forecast, zeroInputs, DEMO_PARAMS);
const zTotal = z.incomeDiff.reduce((s, v) => s + v, 0);
assert(zTotal === 0, "Zero inputs → zero impact");

// Max ramp
const maxInputs: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 1000 : 0),
  staffCost: 3000, staffStart: 4, cxOverride: null,
};
const m = runWhatIf(forecast, maxInputs, DEMO_PARAMS);
const mp = calcPayback(m, agpPct, 3000, 4, DEMO_PARAMS.periodsCompleted);
assert(mp.breakevenPeriod !== null && mp.breakevenPeriod <= 7, `Max ramp breakeven early: P${mp.breakevenPeriod}`);

// Staff start P1 (immediate hire)
const earlyHire: WhatIfInputs = {
  weeklyRamp: Array(13).fill(200),
  staffCost: 5000, staffStart: 1, cxOverride: null,
};
const eh = runWhatIf(forecast, earlyHire, DEMO_PARAMS);
const ehp = calcPayback(eh, agpPct, 5000, 1, DEMO_PARAMS.periodsCompleted);
assert(ehp.costPerPeriod[0] === 0, "P1 cost=0 (actual period, not forecast)");
assert(ehp.cumCost[12] === 5000 * 10, "Only 10 forecast periods incur cost");

// CX = 0% (no cancellations)
const zeroCx: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 200 : 0),
  staffCost: 5000, staffStart: 4, cxOverride: 0,
};
const zc = runWhatIf(forecast, zeroCx, DEMO_PARAMS);
const zcTotal = zc.incomeDiff.reduce((s, v) => s + v, 0);
assert(zcTotal > totalRevImpact, `0% CX (${fmtCurrency(zcTotal)}) > 10% CX (${fmtCurrency(totalRevImpact)})`);

// ── SCENARIO 8: Historical Auto-Calculation ──
section("SCENARIO 8: Historical Metrics Derivation");

const metrics = deriveMetricsFromHistory(DEMO_ACTUALS);
console.log(`  Derived CX Rate: ${fmtPct(metrics.cxRate)}`);
console.log(`  Derived AGP Margin: ${fmtPct(metrics.agpMargin)}`);
console.log(`  Derived COGS Ratio: ${fmtPct(metrics.cogsRatio)}`);
console.log(`  Derived Expense Ratio: ${fmtPct(metrics.expenseRatio)}`);
console.log(`  Avg Rev/Period: ${fmtCurrency(metrics.avgRevenuePerPeriod)}`);
console.log(`  Revenue Growth Rate: ${fmtPct(metrics.revenueGrowthRate)}`);
console.log(`  Service Mix: ${fmtPct(metrics.serviceMix)}`);

assert(metrics.agpMargin > 0.40 && metrics.agpMargin < 0.60, `AGP margin reasonable: ${fmtPct(metrics.agpMargin)}`);
assert(metrics.cogsRatio > 0.10 && metrics.cogsRatio < 0.30, `COGS ratio reasonable: ${fmtPct(metrics.cogsRatio)}`);
assert(metrics.serviceMix > 0.70, `Service mix dominant: ${fmtPct(metrics.serviceMix)}`);

// ── SCENARIO 9: Forecast Generation from Metrics ──
section("SCENARIO 9: Auto-Generated Forecast");

const autoForecast = generateForecastFromMetrics(DEMO_ACTUALS, metrics, 13);
assert(autoForecast.length === 13, `13 periods generated (got ${autoForecast.length})`);
assert(autoForecast[0].totalIncome === DEMO_ACTUALS[0].totalIncome, "P1 = actual");
assert(autoForecast[2].totalIncome === DEMO_ACTUALS[2].totalIncome, "P3 = actual");
assert(autoForecast[3].totalIncome > 0, `P4 projected: ${fmtCurrency(autoForecast[3].totalIncome)}`);
assert(autoForecast[12].totalIncome > autoForecast[3].totalIncome, "Revenue grows over time");

// ── SCENARIO 10: Warren's Specific Ramp Scenario ──
section("SCENARIO 10: Warren's Real Ramp (gradual increase)");

const warrenRamp: WhatIfInputs = {
  weeklyRamp: [0, 0, 0, 100, 125, 150, 150, 150, 150, 150, 150, 150, 150],
  staffCost: 5500, staffStart: 4, cxOverride: null,
};
const wr = runWhatIf(forecast, warrenRamp, DEMO_PARAMS);
const wrp = calcPayback(wr, agpPct, 5500, 4, DEMO_PARAMS.periodsCompleted);

console.log(`  P4 ramp revenue: ${fmtCurrency(wr.incomeDiff[3])}`);
console.log(`  P5 ramp revenue: ${fmtCurrency(wr.incomeDiff[4])}`);
console.log(`  P6 ramp revenue: ${fmtCurrency(wr.incomeDiff[5])}`);
console.log(`  P13 ramp revenue: ${fmtCurrency(wr.incomeDiff[12])}`);
assert(wr.incomeDiff[4] > wr.incomeDiff[3], "P5 > P4 (ramp increases)");
assert(wr.incomeDiff[5] > wr.incomeDiff[4], "P6 > P5 (ramp increases)");
console.log(`  Revenue impact: ${fmtCurrency(wr.incomeDiff.reduce((s,v) => s+v, 0))}`);
console.log(`  Net impact: ${fmtCurrency(wr.netDiff.reduce((s,v) => s+v, 0))}`);
console.log(`  Breakeven: ${wrp.breakevenPeriod ? `P${wrp.breakevenPeriod}` : "Not reached"}`);

// ── SUMMARY ──
console.log(`\n${"=".repeat(50)}`);
console.log(`RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail} total`);
console.log(`${"=".repeat(50)}\n`);

if (fail > 0) process.exit(1);
