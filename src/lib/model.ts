/**
 * RecurCast Financial Model -- client-side engine.
 * Ports the *12/*16 additive revenue model, AGP payback,
 * and scenario comparison logic from generate_base_v2.py.
 */

export const NUM_PERIODS = 13;

export interface ClientParameters {
  locationName: string;
  fiscalYear: number;
  periodsCompleted: number;
  cxRate: number;           // cancellation rate (e.g. 0.10 = 10%)
  avgServicePrice: number;  // avg sale price per customer
  tripChargePerCust: number;
  allocWin: number;         // Windows/RPM allocation %
  allocRef: number;         // Refresh allocation %
  allocSan: number;         // Sani allocation %
  instRateWin: number;      // Install rate: Windows (e.g. 2.0)
  instRateRef: number;      // Install rate: Refresh (e.g. 0.10)
  instRateSan: number;      // Install rate: Sani (e.g. 0.50)
  commissionRate: number;   // sales commission as % of new revenue (e.g. 0.10 = 10%)
}

export interface PeriodData {
  productRev: number;
  serviceRev: number;
  installRev: number;
  tripRev: number;
  totalIncome: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpense: number;
  netIncome: number;
  adjGrossProfit: number;
}

export interface PriceIncreaseInput {
  servicePct: number;       // e.g. 0.05 = 5% service price increase
  serviceStartPeriod: number; // period the service increase takes effect (1-indexed)
  productPct: number;       // e.g. 0.08 = 8% product price increase
  productStartPeriod: number; // period the product increase takes effect (1-indexed)
}

export interface WhatIfInputs {
  weeklyRamp: number[];     // 13 values: new sales $/wk per period
  staffCost: number;        // monthly loaded cost
  staffStart: number;       // period hire begins (1-indexed)
  cxOverride: number | null; // null = use base rate
  priceIncrease?: PriceIncreaseInput; // optional price increase scenario
}

export interface WhatIfResult {
  baseIncome: number[];
  baseCOGS: number[];
  baseExpense: number[];
  baseAGP: number[];
  baseNetIncome: number[];
  scenarioIncome: number[];
  scenarioCOGS: number[];
  scenarioExpense: number[];
  scenarioAGP: number[];
  scenarioNetIncome: number[];
  incomeDiff: number[];
  agpDiff: number[];
  netDiff: number[];
  cogsDiff: number[];
  expenseDiff: number[];
  cumulativeNetImpact: number[];
}

export interface PaybackResult {
  agpPct: number;
  costPerPeriod: number[];
  incRevPerPeriod: number[];
  agpFromRev: number[];
  agpCollected: number[];   // 1-period delay
  netPerPeriod: number[];
  cumCost: number[];
  cumAGP: number[];
  cumNet: number[];
  breakevenPeriod: number | null;
}

// ── Revenue Model (*12/*16 additive) ──

export function calcRampRevenue(weeklyAvgs: number[], period: number): number {
  let rev = weeklyAvgs[period] * 12;
  for (let i = 0; i < period; i++) {
    rev += weeklyAvgs[i] * 16;
  }
  return rev;
}

export function calcAllRampRevenue(weeklyAvgs: number[]): number[] {
  return Array.from({ length: NUM_PERIODS }, (_, i) =>
    calcRampRevenue(weeklyAvgs, i)
  );
}

// ── Install Revenue (non-additive, per Warren's corrected formula) ──

export function calcInstallRevenue(
  newServiceWeekly: number,
  params: ClientParameters
): number {
  return (
    newServiceWeekly * params.allocWin * params.instRateWin +
    newServiceWeekly * params.allocRef * params.instRateRef +
    newServiceWeekly * params.allocSan * params.instRateSan
  ) * 4;
}

// ── What-If Scenario Comparison ──

/**
 * Derive cost ratios from actual base forecast data.
 * These ratios are used to auto-scale COGS and variable expenses
 * when revenue changes in a What-If scenario.
 */
export function deriveCostRatios(baseForecast: PeriodData[]): {
  cogsRatio: number;
  variableExpenseRatio: number;
} {
  const totalIncome = baseForecast.reduce((s, p) => s + p.totalIncome, 0);
  const totalCOGS = baseForecast.reduce((s, p) => s + p.totalCOGS, 0);
  const totalExpense = baseForecast.reduce((s, p) => s + p.totalExpense, 0);

  const cogsRatio = totalIncome > 0 ? totalCOGS / totalIncome : 0.20;
  // Not all expenses are variable -- estimate ~40% of expenses scale with revenue
  // (route labor, gas, supplies), rest is fixed (admin, rent, insurance)
  const totalVariableExpense = totalExpense * 0.40;
  const variableExpenseRatio = totalIncome > 0 ? totalVariableExpense / totalIncome : 0.22;

  return { cogsRatio, variableExpenseRatio };
}

export function runWhatIf(
  baseForecast: PeriodData[],
  inputs: WhatIfInputs,
  params: ClientParameters
): WhatIfResult {
  const pc = params.periodsCompleted;
  const effCx = inputs.cxOverride ?? params.cxRate;
  const cxDelta = effCx - params.cxRate; // positive = higher churn = less revenue
  const rampRevenue = calcAllRampRevenue(inputs.weeklyRamp);
  const { cogsRatio, variableExpenseRatio } = deriveCostRatios(baseForecast);

  const baseIncome = baseForecast.map(p => p.totalIncome);
  const baseCOGS = baseForecast.map(p => p.totalCOGS);
  const baseExpense = baseForecast.map(p => p.totalExpense);
  const baseAGP = baseForecast.map(p => p.adjGrossProfit);
  const baseNetIncome = baseForecast.map(p => p.netIncome);

  const scenarioIncome: number[] = [];
  const scenarioCOGS: number[] = [];
  const scenarioExpense: number[] = [];
  const scenarioAGP: number[] = [];
  const scenarioNetIncome: number[] = [];

  const pi = inputs.priceIncrease;

  for (let i = 0; i < NUM_PERIODS; i++) {
    const pn = i + 1;
    const extraRev = pn > pc ? rampRevenue[i] * (1 - effCx) : 0;
    const baseSalary = (pn > pc && pn >= inputs.staffStart) ? inputs.staffCost : 0;
    const commission = extraRev > 0 ? extraRev * params.commissionRate : 0;
    const staffHit = baseSalary + commission;

    // CX impact on EXISTING base revenue (independent of salesperson)
    const cxBaseImpact = (pn > pc && cxDelta !== 0)
      ? -baseForecast[i].serviceRev * cxDelta
      : 0;

    // Price increase impact on existing base revenue
    let priceIncreaseRev = 0;
    if (pi && pn > pc) {
      if (pi.servicePct !== 0 && pn >= pi.serviceStartPeriod) {
        priceIncreaseRev += baseForecast[i].serviceRev * pi.servicePct;
      }
      if (pi.productPct !== 0 && pn >= pi.productStartPeriod) {
        priceIncreaseRev += baseForecast[i].productRev * pi.productPct;
      }
    }

    const totalExtraRev = extraRev + cxBaseImpact + priceIncreaseRev;

    // Auto-scale: incremental COGS and variable expenses track revenue
    const extraCOGS = totalExtraRev * cogsRatio;
    const extraVarExpense = totalExtraRev * variableExpenseRatio;

    const newIncome = baseIncome[i] + totalExtraRev;
    const newCOGS = baseCOGS[i] + extraCOGS;
    const newExpense = baseExpense[i] + extraVarExpense + staffHit;
    const newNet = baseNetIncome[i] + totalExtraRev - extraCOGS - extraVarExpense - staffHit;

    scenarioIncome.push(newIncome);
    scenarioCOGS.push(newCOGS);
    scenarioExpense.push(newExpense);
    scenarioAGP.push(baseAGP[i] + totalExtraRev - extraCOGS);
    scenarioNetIncome.push(newNet);
  }

  const incomeDiff = scenarioIncome.map((v, i) => v - baseIncome[i]);
  const cogsDiff = scenarioCOGS.map((v, i) => v - baseCOGS[i]);
  const expenseDiff = scenarioExpense.map((v, i) => v - baseExpense[i]);
  const agpDiff = scenarioAGP.map((v, i) => v - baseAGP[i]);
  const netDiff = scenarioNetIncome.map((v, i) => v - baseNetIncome[i]);

  const cumulativeNetImpact: number[] = [];
  let cum = 0;
  for (let i = 0; i < NUM_PERIODS; i++) {
    cum += netDiff[i];
    cumulativeNetImpact.push(cum);
  }

  return {
    baseIncome, baseCOGS, baseExpense, baseAGP, baseNetIncome,
    scenarioIncome, scenarioCOGS, scenarioExpense, scenarioAGP, scenarioNetIncome,
    incomeDiff, agpDiff, netDiff, cogsDiff, expenseDiff,
    cumulativeNetImpact,
  };
}

// ── AGP-Based Payback with 1-Period Delay ──

export const PAYBACK_PERIODS = 26; // 2 years for breakeven extrapolation

export function calcPayback(
  whatIfResult: WhatIfResult,
  agpPct: number,
  staffCost: number,
  staffStart: number,
  periodsCompleted: number,
  commissionRate: number = 0.10
): PaybackResult {
  const costPerPeriod: number[] = [];
  const incRevPerPeriod: number[] = [];
  const agpFromRev: number[] = [];
  const agpCollected: number[] = [];
  const netPerPeriod: number[] = [];
  const cumCost: number[] = [];
  const cumAGP: number[] = [];
  const cumNet: number[] = [];

  // For periods beyond 13, extrapolate at P13's steady-state level
  const lastPeriodRev = whatIfResult.incomeDiff[NUM_PERIODS - 1] ?? 0;

  for (let i = 0; i < PAYBACK_PERIODS; i++) {
    const pn = i + 1;
    const rev = i < NUM_PERIODS ? whatIfResult.incomeDiff[i] : lastPeriodRev;
    incRevPerPeriod.push(rev);

    const baseSalary = (pn > periodsCompleted && pn >= staffStart) ? staffCost : 0;
    const commission = rev > 0 ? rev * commissionRate : 0;
    const cost = baseSalary + commission;
    costPerPeriod.push(cost);
    agpFromRev.push(rev * agpPct);
    agpCollected.push(i > 0 ? agpFromRev[i - 1] : 0);
    netPerPeriod.push(agpCollected[i] - cost);

    const prevCost = i > 0 ? cumCost[i - 1] : 0;
    const prevAGP = i > 0 ? cumAGP[i - 1] : 0;
    cumCost.push(prevCost + cost);
    cumAGP.push(prevAGP + agpCollected[i]);
    cumNet.push(cumAGP[i] - cumCost[i]);
  }

  let breakevenPeriod: number | null = null;
  for (let i = 0; i < PAYBACK_PERIODS; i++) {
    if (cumCost[i] > 0 && cumNet[i] >= 0) {
      breakevenPeriod = i + 1;
      break;
    }
  }

  return {
    agpPct, costPerPeriod, incRevPerPeriod,
    agpFromRev, agpCollected, netPerPeriod,
    cumCost, cumAGP, cumNet, breakevenPeriod,
  };
}

// ── Utility: Format currency ──

export function fmtCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
