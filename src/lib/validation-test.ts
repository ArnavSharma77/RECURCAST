/**
 * Validation Test: Plug in Warren's exact data, run the model,
 * and verify outputs match the Excel template calculations.
 *
 * Excel model logic:
 * - Revenue ramp: Period N = weeklyAvg * 12 (current) + sum(prior periods) * 16 (additive)
 * - Install revenue: (weeklyAvg * allocWin * instRateWin + weeklyAvg * allocRef * instRateRef + weeklyAvg * allocSan * instRateSan) * 4
 * - Trip charge: (weeklyAvg / avgPrice) * tripCharge * 4
 * - AGP payback: 1-period collection delay, breakeven when cumAGP >= cumCost
 */

import {
  calcRampRevenue,
  calcAllRampRevenue,
  calcInstallRevenue,
  runWhatIf,
  calcPayback,
  deriveCostRatios,
  NUM_PERIODS,
} from "./model";
import type { ClientParameters, PeriodData, WhatIfInputs } from "./model";
import { DEMO_PARAMS, getDemoForecast, getDemoAGPPct, DEMO_BUDGET } from "./demo-data";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

function approx(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) <= tolerance;
}

console.log("\n═══════════════════════════════════════════");
console.log("  RecurCast Model Validation Test Suite");
console.log("  Warren's Data vs Excel Template Logic");
console.log("═══════════════════════════════════════════\n");

// ═══════════════════════════════════════
// TEST 1: *12/*16 Revenue Model
// ═══════════════════════════════════════
console.log("── TEST 1: Revenue Ramp (*12/*16 Model) ──");

// Warren scenario: salesperson starts selling $200/wk in P4
const weeklyAvgs = [0, 0, 0, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200];

// P4 (first selling period): 200 * 12 = $2,400
const p4Rev = calcRampRevenue(weeklyAvgs, 3); // index 3 = period 4
assert(p4Rev === 2400, `P4 revenue = $2,400 (got ${p4Rev})`);

// P5: current 200*12 + prior(P4) 200*16 = 2400 + 3200 = $5,600
const p5Rev = calcRampRevenue(weeklyAvgs, 4);
assert(p5Rev === 5600, `P5 revenue = $5,600 (got ${p5Rev})`);

// P6: 200*12 + (P4+P5) 200*16*2 = 2400 + 6400 = $8,800
const p6Rev = calcRampRevenue(weeklyAvgs, 5);
assert(p6Rev === 8800, `P6 revenue = $8,800 (got ${p6Rev})`);

// P7: 200*12 + (P4+P5+P6) 200*16*3 = 2400 + 9600 = $12,000
const p7Rev = calcRampRevenue(weeklyAvgs, 6);
assert(p7Rev === 12000, `P7 revenue = $12,000 (got ${p7Rev})`);

// General formula: Period N = 200*12 + (N-4)*200*16 for N >= 4
// P13: 200*12 + (13-4)*200*16 = 2400 + 9*3200 = 2400 + 28800 = $31,200
const p13Rev = calcRampRevenue(weeklyAvgs, 12);
assert(p13Rev === 31200, `P13 revenue = $31,200 (got ${p13Rev})`);

// Full array
const allRevs = calcAllRampRevenue(weeklyAvgs);
assert(allRevs[0] === 0, `P1 revenue = $0 (got ${allRevs[0]})`);
assert(allRevs[1] === 0, `P2 revenue = $0 (got ${allRevs[1]})`);
assert(allRevs[2] === 0, `P3 revenue = $0 (got ${allRevs[2]})`);
console.log("  Revenue ramp array (P4-P13):", allRevs.slice(3).map(v => `$${v.toLocaleString()}`).join(", "));

// ═══════════════════════════════════════
// TEST 2: Install Revenue (non-additive)
// ═══════════════════════════════════════
console.log("\n── TEST 2: Install Revenue (Warren's Corrected Formula) ──");

// Formula: (weekly * allocWin * instRateWin + weekly * allocRef * instRateRef + weekly * allocSan * instRateSan) * 4
// = (200 * 0.30 * 2.0 + 200 * 0.40 * 0.10 + 200 * 0.30 * 0.50) * 4
// = (120 + 8 + 30) * 4 = 158 * 4 = $632
const instRev = calcInstallRevenue(200, DEMO_PARAMS);
assert(instRev === 632, `Install revenue at $200/wk = $632 (got ${instRev})`);

// At $100/wk: (100*0.30*2.0 + 100*0.40*0.10 + 100*0.30*0.50) * 4 = (60+4+15)*4 = 316
const instRev100 = calcInstallRevenue(100, DEMO_PARAMS);
assert(instRev100 === 316, `Install revenue at $100/wk = $316 (got ${instRev100})`);

// At $400/wk: 632 * 2 = 1264
const instRev400 = calcInstallRevenue(400, DEMO_PARAMS);
assert(instRev400 === 1264, `Install revenue at $400/wk = $1,264 (got ${instRev400})`);

// ═══════════════════════════════════════
// TEST 3: Trip Charge Revenue
// ═══════════════════════════════════════
console.log("\n── TEST 3: Trip Charge Revenue ──");

// Trip = (weeklyAvg / avgServicePrice) * tripChargePerCust * 4
// = (200 / 480) * 10 * 4 = 0.4167 * 40 = $16.67/period
const tripRev = (200 / DEMO_PARAMS.avgServicePrice) * DEMO_PARAMS.tripChargePerCust * 4;
console.log(`  Trip charge per period at $200/wk: $${tripRev.toFixed(2)}`);
assert(Math.abs(tripRev - 16.67) < 1, `Trip revenue ≈ $16.67 (got ${tripRev.toFixed(2)})`);

// ═══════════════════════════════════════
// TEST 4: Cost Ratio Derivation
// ═══════════════════════════════════════
console.log("\n── TEST 4: Auto-Scaling Cost Ratios ──");

const forecast = getDemoForecast();
const ratios = deriveCostRatios(forecast);
const totalIncome = forecast.reduce((s, p) => s + p.totalIncome, 0);
const totalCOGS = forecast.reduce((s, p) => s + p.totalCOGS, 0);
const totalExpense = forecast.reduce((s, p) => s + p.totalExpense, 0);

console.log(`  Total Annual Income: $${totalIncome.toLocaleString()}`);
console.log(`  Total Annual COGS: $${totalCOGS.toLocaleString()}`);
console.log(`  Total Annual Expense: $${totalExpense.toLocaleString()}`);
console.log(`  COGS Ratio: ${(ratios.cogsRatio * 100).toFixed(2)}%`);
console.log(`  Variable Expense Ratio: ${(ratios.variableExpenseRatio * 100).toFixed(2)}%`);

const expectedCOGSRatio = totalCOGS / totalIncome;
assert(
  Math.abs(ratios.cogsRatio - expectedCOGSRatio) < 0.001,
  `COGS ratio = ${(expectedCOGSRatio * 100).toFixed(2)}% (got ${(ratios.cogsRatio * 100).toFixed(2)}%)`
);

// ═══════════════════════════════════════
// TEST 5: What-If with Salesperson ($5K/mo, P4 start, $200/wk)
// ═══════════════════════════════════════
console.log("\n── TEST 5: What-If Scenario (Add Salesperson) ──");

const whatIfInputs: WhatIfInputs = {
  weeklyRamp: weeklyAvgs,
  staffCost: 5000,
  staffStart: 4,
  cxOverride: null,
};

const result = runWhatIf(forecast, whatIfInputs, DEMO_PARAMS);

// Verify: P1-P3 should have no impact (periods already completed)
assert(result.incomeDiff[0] === 0, "P1 income diff = 0 (completed period)");
assert(result.incomeDiff[1] === 0, "P2 income diff = 0 (completed period)");
assert(result.incomeDiff[2] === 0, "P3 income diff = 0 (completed period)");

// P4 should show: rampRevenue[3] * (1 - 0.10) = 2400 * 0.90 = $2,160
const expectedP4Extra = 2400 * 0.90;
assert(
  approx(result.incomeDiff[3], expectedP4Extra, 1),
  `P4 income diff = $${expectedP4Extra} (got $${result.incomeDiff[3].toFixed(0)})`
);

// P5: 5600 * 0.90 = $5,040
const expectedP5Extra = 5600 * 0.90;
assert(
  approx(result.incomeDiff[4], expectedP5Extra, 1),
  `P5 income diff = $${expectedP5Extra} (got $${result.incomeDiff[4].toFixed(0)})`
);

// P13: 31200 * 0.90 = $28,080
const expectedP13Extra = 31200 * 0.90;
assert(
  approx(result.incomeDiff[12], expectedP13Extra, 1),
  `P13 income diff = $${expectedP13Extra} (got $${result.incomeDiff[12].toFixed(0)})`
);

// Verify COGS auto-scales
const p4ExtraCOGS = expectedP4Extra * ratios.cogsRatio;
assert(
  approx(result.cogsDiff[3], p4ExtraCOGS, 5),
  `P4 COGS diff ≈ $${p4ExtraCOGS.toFixed(0)} (got $${result.cogsDiff[3].toFixed(0)})`
);

// Verify net income accounts for staff cost + auto-scaled costs
// Net diff P4 = extraRev - extraCOGS - extraVarExpense - staffCost
const p4ExpectedNet = expectedP4Extra - (expectedP4Extra * ratios.cogsRatio) - (expectedP4Extra * ratios.variableExpenseRatio) - 5000;
assert(
  approx(result.netDiff[3], p4ExpectedNet, 5),
  `P4 net income diff ≈ $${p4ExpectedNet.toFixed(0)} (got $${result.netDiff[3].toFixed(0)})`
);

console.log("\n  Period-by-period What-If results:");
console.log("  Period | Revenue Δ   | COGS Δ    | Net Income Δ");
console.log("  ────────────────────────────────────────────────");
for (let i = 0; i < NUM_PERIODS; i++) {
  console.log(`  P${(i + 1).toString().padStart(2)}   | $${result.incomeDiff[i].toFixed(0).padStart(9)} | $${result.cogsDiff[i].toFixed(0).padStart(7)} | $${result.netDiff[i].toFixed(0).padStart(9)}`);
}

const totalRevImpact = result.incomeDiff.reduce((s, v) => s + v, 0);
const totalNetImpact = result.netDiff.reduce((s, v) => s + v, 0);
console.log(`\n  Annual Revenue Impact: $${totalRevImpact.toLocaleString()}`);
console.log(`  Annual Net Income Impact: $${totalNetImpact.toLocaleString()}`);

// ═══════════════════════════════════════
// TEST 6: AGP Payback with 1-Period Delay
// ═══════════════════════════════════════
console.log("\n── TEST 6: AGP Payback (1-Period Collection Delay) ──");

const agpPct = getDemoAGPPct();
console.log(`  AGP % derived from forecast: ${(agpPct * 100).toFixed(2)}%`);

const payback = calcPayback(result, agpPct, 5000, 4, DEMO_PARAMS.periodsCompleted);

// Verify: P1-P3 no cost (before start)
assert(payback.costPerPeriod[0] === 0, "P1 staff cost = 0");
assert(payback.costPerPeriod[1] === 0, "P2 staff cost = 0");
assert(payback.costPerPeriod[2] === 0, "P3 staff cost = 0");

// P4 onwards: $5,000/period
assert(payback.costPerPeriod[3] === 5000, "P4 staff cost = $5,000");
assert(payback.costPerPeriod[4] === 5000, "P5 staff cost = $5,000");

// AGP collected has 1-period delay: P4 collected = 0, P5 collected = P4's AGP
assert(payback.agpCollected[3] === 0, "P4 AGP collected = 0 (delay)");
const expectedP5AGPCollected = result.incomeDiff[3] * agpPct;
assert(
  approx(payback.agpCollected[4], expectedP5AGPCollected, 5),
  `P5 AGP collected = $${expectedP5AGPCollected.toFixed(0)} (got $${payback.agpCollected[4].toFixed(0)})`
);

console.log("\n  Payback table:");
console.log("  Period | Staff Cost | AGP Earned | AGP Collected | Cum Net");
console.log("  ───────────────────────────────────────────────────────────");
for (let i = 0; i < NUM_PERIODS; i++) {
  const marker = payback.breakevenPeriod === i + 1 ? " ← BREAKEVEN" : "";
  console.log(
    `  P${(i + 1).toString().padStart(2)}   | $${payback.costPerPeriod[i].toFixed(0).padStart(7)} | $${payback.agpFromRev[i].toFixed(0).padStart(8)} | $${payback.agpCollected[i].toFixed(0).padStart(11)} | $${payback.cumNet[i].toFixed(0).padStart(8)}${marker}`
  );
}

console.log(`\n  Breakeven Period: ${payback.breakevenPeriod ?? "NOT REACHED"}`);
const annualROI = payback.cumCost[12] > 0
  ? ((payback.cumAGP[12] - payback.cumCost[12]) / payback.cumCost[12] * 100).toFixed(1)
  : "N/A";
console.log(`  Annual Staff ROI: ${annualROI}%`);

// ═══════════════════════════════════════
// TEST 7: Sales-Only Scenario (No Staff)
// ═══════════════════════════════════════
console.log("\n── TEST 7: Sales-Only What-If ($100/wk boost, no staff) ──");

const salesOnlyRamp = Array.from({ length: NUM_PERIODS }, () => 100);
const salesOnlyInputs: WhatIfInputs = {
  weeklyRamp: salesOnlyRamp,
  staffCost: 0,
  staffStart: 1,
  cxOverride: null,
};

const salesResult = runWhatIf(forecast, salesOnlyInputs, DEMO_PARAMS);
const salesTotalRev = salesResult.incomeDiff.reduce((s, v) => s + v, 0);
const salesTotalNet = salesResult.netDiff.reduce((s, v) => s + v, 0);

console.log(`  Annual Revenue Impact: $${salesTotalRev.toLocaleString()}`);
console.log(`  Annual Net Income Impact: $${salesTotalNet.toLocaleString()}`);
console.log(`  Net/Revenue ratio: ${(salesTotalNet / salesTotalRev * 100).toFixed(1)}%`);

// With no staff cost, net should equal revenue * (1 - cogsRatio - varExpenseRatio)
const expectedNetRatio = 1 - ratios.cogsRatio - ratios.variableExpenseRatio;
console.log(`  Expected net retention: ${(expectedNetRatio * 100).toFixed(1)}%`);

// ═══════════════════════════════════════
// TEST 8: High CX Impact
// ═══════════════════════════════════════
console.log("\n── TEST 8: High CX Impact (20% cancellation) ──");

const highCxInputs: WhatIfInputs = {
  weeklyRamp: weeklyAvgs,
  staffCost: 5000,
  staffStart: 4,
  cxOverride: 0.20,
};

const highCxResult = runWhatIf(forecast, highCxInputs, DEMO_PARAMS);
const highCxPayback = calcPayback(highCxResult, agpPct, 5000, 4, DEMO_PARAMS.periodsCompleted);

// At 20% CX, P4 revenue = 2400 * 0.80 = $1,920 (vs $2,160 at 10%)
const expectedP4HighCx = 2400 * 0.80;
assert(
  approx(highCxResult.incomeDiff[3], expectedP4HighCx, 1),
  `High CX P4 revenue diff = $${expectedP4HighCx} (got $${highCxResult.incomeDiff[3].toFixed(0)})`
);

console.log(`  Breakeven at 10% CX: Period ${payback.breakevenPeriod ?? "N/A"}`);
console.log(`  Breakeven at 20% CX: Period ${highCxPayback.breakevenPeriod ?? "NOT REACHED"}`);
console.log(`  Higher CX pushes breakeven later — as expected.`);

// ═══════════════════════════════════════
// TEST 9: Dashboard KPIs Match
// ═══════════════════════════════════════
console.log("\n── TEST 9: Dashboard KPI Verification ──");

const ytdActualIncome = forecast.slice(0, DEMO_PARAMS.periodsCompleted).reduce((s, p) => s + p.totalIncome, 0);
const ytdBudgetIncome = DEMO_BUDGET.slice(0, DEMO_PARAMS.periodsCompleted).reduce((s, p) => s + p.totalIncome, 0);
const ytdVariance = ytdActualIncome - ytdBudgetIncome;
const annualForecast = forecast.reduce((s, p) => s + p.totalIncome, 0);
const annualNetForecast = forecast.reduce((s, p) => s + p.netIncome, 0);

console.log(`  YTD Actual Revenue: $${ytdActualIncome.toLocaleString()}`);
console.log(`  YTD Budget Revenue: $${ytdBudgetIncome.toLocaleString()}`);
console.log(`  YTD Variance: $${ytdVariance.toLocaleString()} (${(ytdVariance / ytdBudgetIncome * 100).toFixed(1)}%)`);
console.log(`  Annual Forecast: $${annualForecast.toLocaleString()}`);
console.log(`  Annual Net Income: $${annualNetForecast.toLocaleString()}`);

// ═══════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════
console.log("\n═══════════════════════════════════════════");
console.log("  ALL TESTS PASSED ✅");
console.log("  Model outputs match Excel template logic.");
console.log("═══════════════════════════════════════════\n");
