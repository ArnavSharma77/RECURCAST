/**
 * Unit tests for the RecurCast financial model.
 * Verifies *12/*16 revenue, payback calculation, and edge cases.
 */
import {
  calcRampRevenue, calcAllRampRevenue, calcPayback, runWhatIf,
  calcInstallRevenue, NUM_PERIODS,
} from "./model";
import type { WhatIfInputs } from "./model";
import { DEMO_PARAMS, getDemoForecast, getDemoAGPPct } from "./demo-data";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`  PASS: ${msg}`);
}

function approxEq(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) <= tolerance;
}

// TEST 1: *12/*16 Revenue Model
console.log("\n=== TEST 1: Revenue Model (*12/*16) ===");
const ramp = [100, 100, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
assert(calcRampRevenue(ramp, 0) === 1200, "P1: $100/wk * 12 = $1,200");
assert(calcRampRevenue(ramp, 1) === 2800, "P2: $100*12 + $100*16 = $2,800");
assert(calcRampRevenue(ramp, 2) === 4400, "P3: $100*12 + 2*$100*16 = $4,400");
assert(calcRampRevenue(ramp, 3) === 4800, "P4 (no new sales): 3*$100*16 = $4,800");

// TEST 2: Install Revenue (non-additive)
console.log("\n=== TEST 2: Install Revenue ===");
const instRev = calcInstallRevenue(500, DEMO_PARAMS);
const expected = (500 * 0.30 * 2.0 + 500 * 0.40 * 0.10 + 500 * 0.30 * 0.50) * 4;
assert(approxEq(instRev, expected), `Install = ${instRev} (expected ${expected})`);

// TEST 3: Payback with 1-period delay
console.log("\n=== TEST 3: AGP Payback ===");
const forecast = getDemoForecast();
const agpPct = getDemoAGPPct();
console.log(`  AGP%: ${(agpPct * 100).toFixed(1)}%`);

const inputs: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 200 : 0),
  staffCost: 5000,
  staffStart: 4,
  cxOverride: null,
};

const result = runWhatIf(forecast, inputs, DEMO_PARAMS);
const payback = calcPayback(result, agpPct, 5000, 4, DEMO_PARAMS.periodsCompleted);

assert(payback.costPerPeriod[0] === 0, "No cost before start");
assert(payback.costPerPeriod[1] === 0, "No cost P2");
assert(payback.costPerPeriod[2] === 0, "No cost P3");
assert(payback.costPerPeriod[3] === 5000, "Cost P4 = $5,000");
assert(payback.agpCollected[0] === 0, "AGP collected P1 = 0 (1-period delay)");
assert(payback.agpCollected[3] === 0, "AGP collected P4 = 0 (delay: P4 rev not yet)");
assert(payback.agpCollected[4] > 0, "AGP collected P5 > 0");
assert(payback.cumCost[12] === 5000 * 10, "Cum cost P13 = $50,000 (10 periods)");
assert(payback.breakevenPeriod !== null || payback.cumAGP[12] < payback.cumCost[12],
  "Breakeven detected or correctly not reached");

// TEST 4: Edge case - zero ramp
console.log("\n=== TEST 4: Zero Ramp ===");
const zeroInputs: WhatIfInputs = {
  weeklyRamp: Array(13).fill(0),
  staffCost: 5000,
  staffStart: 4,
  cxOverride: null,
};
const zeroResult = runWhatIf(forecast, zeroInputs, DEMO_PARAMS);
const zeroPayback = calcPayback(zeroResult, agpPct, 5000, 4, DEMO_PARAMS.periodsCompleted);
assert(zeroPayback.breakevenPeriod === null, "No breakeven with zero ramp");
assert(zeroPayback.cumAGP[12] === 0, "No AGP collected with zero ramp");

// TEST 5: High ramp quick breakeven
console.log("\n=== TEST 5: High Ramp ===");
const highInputs: WhatIfInputs = {
  weeklyRamp: Array.from({ length: 13 }, (_, i) => i >= 3 ? 500 : 0),
  staffCost: 3000,
  staffStart: 4,
  cxOverride: null,
};
const highResult = runWhatIf(forecast, highInputs, DEMO_PARAMS);
const highPayback = calcPayback(highResult, agpPct, 3000, 4, DEMO_PARAMS.periodsCompleted);
assert(highPayback.breakevenPeriod !== null, "High ramp should reach breakeven");
assert(highPayback.breakevenPeriod! <= 10, `Breakeven at P${highPayback.breakevenPeriod} (should be early)`);

console.log("\n=== ALL TESTS PASSED ===\n");
