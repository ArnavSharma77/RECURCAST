/**
 * Test auto-scaling of COGS and expenses when revenue changes.
 * Warren: "Corresponding cost like tech cost, cogs, etc should change
 * based on the revenue projections automatically."
 */
import {
  runWhatIf, calcPayback, deriveCostRatios,
  NUM_PERIODS, fmtCurrency, fmtPct,
} from "./model";
import type { WhatIfInputs } from "./model";
import { DEMO_PARAMS, getDemoForecast, getDemoAGPPct } from "./demo-data";

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { fail++; console.log(`  FAIL: ${msg}`); }
  else { pass++; console.log(`  PASS: ${msg}`); }
}
function section(name: string) { console.log(`\n=== ${name} ===`); }

const forecast = getDemoForecast();
const agpPct = getDemoAGPPct();
const ratios = deriveCostRatios(forecast);

section("COST RATIOS");
console.log(`  COGS Ratio: ${fmtPct(ratios.cogsRatio)}`);
console.log(`  Variable Expense Ratio: ${fmtPct(ratios.variableExpenseRatio)}`);
assert(ratios.cogsRatio > 0.15 && ratios.cogsRatio < 0.25, `COGS ratio ${fmtPct(ratios.cogsRatio)} is reasonable`);
assert(ratios.variableExpenseRatio > 0.15 && ratios.variableExpenseRatio < 0.30, `Var expense ratio ${fmtPct(ratios.variableExpenseRatio)} is reasonable`);

section("SCENARIO A: Add Salesperson - Cost Auto-Scaling");
const inputs: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 200 : 0),
  staffCost: 5000, staffStart: 4, staffType: "sales", operationsEfficiency: 0, cxOverride: null,
};
const result = runWhatIf(forecast, inputs, DEMO_PARAMS);

const totalRevDiff = result.incomeDiff.reduce((s, v) => s + v, 0);
const totalCOGSDiff = result.cogsDiff.reduce((s, v) => s + v, 0);
const totalExpDiff = result.expenseDiff.reduce((s, v) => s + v, 0);
const totalNetDiff = result.netDiff.reduce((s, v) => s + v, 0);

console.log(`  Revenue impact: ${fmtCurrency(totalRevDiff)}`);
console.log(`  COGS impact: ${fmtCurrency(totalCOGSDiff)}`);
console.log(`  Expense impact: ${fmtCurrency(totalExpDiff)} (includes staff + variable)`);
console.log(`  Net income impact: ${fmtCurrency(totalNetDiff)}`);

assert(totalCOGSDiff > 0, "COGS increases with revenue");
assert(totalExpDiff > totalCOGSDiff, "Expenses > COGS (includes staff cost)");
assert(totalNetDiff < totalRevDiff, "Net < Revenue (costs absorbed)");
assert(totalNetDiff > 0, "Still net positive");

// Verify: revenue - cogs - expenses = net
for (let i = 0; i < NUM_PERIODS; i++) {
  const expectedNet = result.scenarioIncome[i] - result.scenarioCOGS[i] - result.scenarioExpense[i];
  const actualNet = result.scenarioNetIncome[i];
  assert(Math.abs(expectedNet - actualNet) < 1,
    `P${i+1}: Inc(${fmtCurrency(result.scenarioIncome[i])}) - COGS(${fmtCurrency(result.scenarioCOGS[i])}) - Exp(${fmtCurrency(result.scenarioExpense[i])}) = Net(${fmtCurrency(actualNet)})`);
}

section("SCENARIO B: Boost Sales Only - Cost Scaling Without Staff");
const boostInputs: WhatIfInputs = {
  weeklyRamp: Array(13).fill(100),
  staffCost: 0, staffStart: 1, staffType: "sales", operationsEfficiency: 0, cxOverride: null,
};
const br = runWhatIf(forecast, boostInputs, DEMO_PARAMS);
const brRevDiff = br.incomeDiff.reduce((s, v) => s + v, 0);
const brCOGSDiff = br.cogsDiff.reduce((s, v) => s + v, 0);
const brNetDiff = br.netDiff.reduce((s, v) => s + v, 0);

console.log(`  Revenue impact: ${fmtCurrency(brRevDiff)}`);
console.log(`  COGS impact: ${fmtCurrency(brCOGSDiff)}`);
console.log(`  Net impact: ${fmtCurrency(brNetDiff)}`);

assert(brCOGSDiff > 0, "COGS scales even without staff");
assert(brNetDiff < brRevDiff, "Net < Revenue (COGS + variable expenses deducted)");
assert(brNetDiff > brRevDiff * 0.30, "Net > 30% of revenue (costs are reasonable)");

section("SCENARIO C: Zero Input - No Cost Change");
const zeroInputs: WhatIfInputs = { weeklyRamp: Array(13).fill(0), staffCost: 0, staffStart: 1, staffType: "sales", operationsEfficiency: 0, cxOverride: null };
const zr = runWhatIf(forecast, zeroInputs, DEMO_PARAMS);
assert(zr.cogsDiff.every(v => v === 0), "Zero ramp → zero COGS diff");
assert(zr.expenseDiff.every(v => v === 0), "Zero ramp → zero expense diff");

section("SCENARIO D: Comparison - Old vs New Net Income");
// Old model would show net = rev impact (no cost scaling)
// New model shows net < rev (costs scaled)
console.log(`  Without cost scaling: net would be ${fmtCurrency(totalRevDiff - 50000)} (rev - staff only)`);
console.log(`  With cost scaling: net is ${fmtCurrency(totalNetDiff)} (rev - COGS - var exp - staff)`);
assert(totalNetDiff < totalRevDiff - 50000, "New model correctly reduces net vs naive calc");

section("SCENARIO E: Payback With Auto-Scaled Costs");
const payback = calcPayback(result, agpPct, 5000, 4, DEMO_PARAMS.periodsCompleted);
console.log(`  Breakeven: ${payback.breakevenPeriod ? `Period ${payback.breakevenPeriod}` : "Not reached"}`);
console.log(`  Year-end cum net: ${fmtCurrency(payback.cumNet[12])}`);

// ── SUMMARY ──
console.log(`\n${"=".repeat(50)}`);
console.log(`RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail} total`);
console.log(`${"=".repeat(50)}\n`);
if (fail > 0) process.exit(1);
