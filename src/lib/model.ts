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

export type StaffType = "sales" | "office" | "operations";

export interface WhatIfInputs {
  weeklyRamp: number[];     // 13 values: new sales $/wk per period
  staffCost: number;        // monthly loaded cost
  staffStart: number;       // period hire begins (1-indexed)
  staffType: StaffType;     // type of staff being added
  operationsEfficiency: number; // reserved for future use (currently unused)
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
  const cxDelta = effCx - params.cxRate;
  const rampRevenue = calcAllRampRevenue(inputs.weeklyRamp);
  const { cogsRatio, variableExpenseRatio } = deriveCostRatios(baseForecast);
  const staffType = inputs.staffType ?? "sales";

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
    const isActive = pn > pc && pn >= inputs.staffStart;

    // Revenue generation only applies to sales staff
    const extraRev = (staffType === "sales" && pn > pc) ? rampRevenue[i] * (1 - effCx) : 0;
    const baseSalary = isActive ? inputs.staffCost : 0;
    const commission = (staffType === "sales" && extraRev > 0) ? extraRev * params.commissionRate : 0;
    const staffHit = baseSalary + commission;

    // CX impact on EXISTING base revenue
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

// ── Multi-Year Projection ──

export interface MultiYearAssumptions {
  annualRevenueGrowth: number;  // e.g. 0.10 = 10% growth
  annualExpenseGrowth: number;  // e.g. 0.05 = 5% expense growth
  addStaffYear2: boolean;
  staffCostY2: number;
  staffStartY2: number;        // period within Y2 (1-13)
  weeklyRampY2: number;
  addStaffYear3: boolean;
  staffCostY3: number;
  staffStartY3: number;
  weeklyRampY3: number;
  priceIncreaseY2: number;     // e.g. 0.05 = 5%
  priceIncreaseY3: number;
}

export interface MultiYearResult {
  years: {
    year: number;
    periods: Array<{
      period: number;
      revenue: number;
      cogs: number;
      expense: number;
      netIncome: number;
    }>;
    totalRevenue: number;
    totalNetIncome: number;
    netMargin: number;
  }[];
}

export function projectMultiYear(
  baseForecast: PeriodData[],
  whatIfResult: WhatIfResult,
  params: ClientParameters,
  assumptions: MultiYearAssumptions
): MultiYearResult {
  const { cogsRatio, variableExpenseRatio } = deriveCostRatios(baseForecast);
  const years: MultiYearResult["years"] = [];

  // Year 1: use scenario result
  const y1Periods = whatIfResult.scenarioIncome.map((rev, i) => ({
    period: i + 1,
    revenue: rev,
    cogs: whatIfResult.scenarioCOGS[i],
    expense: whatIfResult.scenarioExpense[i],
    netIncome: whatIfResult.scenarioNetIncome[i],
  }));
  years.push({
    year: 1,
    periods: y1Periods,
    totalRevenue: y1Periods.reduce((s, p) => s + p.revenue, 0),
    totalNetIncome: y1Periods.reduce((s, p) => s + p.netIncome, 0),
    netMargin: 0,
  });
  years[0].netMargin = years[0].totalRevenue > 0
    ? years[0].totalNetIncome / years[0].totalRevenue
    : 0;

  // Year 2 and 3: project forward from P13 ending state
  for (let yr = 2; yr <= 3; yr++) {
    const prevYear = years[yr - 2];
    const lastPeriod = prevYear.periods[NUM_PERIODS - 1];
    const growthFactor = 1 + assumptions.annualRevenueGrowth;
    const expGrowthFactor = 1 + assumptions.annualExpenseGrowth;

    const isY2 = yr === 2;
    const addStaff = isY2 ? assumptions.addStaffYear2 : assumptions.addStaffYear3;
    const sCost = isY2 ? assumptions.staffCostY2 : assumptions.staffCostY3;
    const sStart = isY2 ? assumptions.staffStartY2 : assumptions.staffStartY3;
    const weeklyRamp = isY2 ? assumptions.weeklyRampY2 : assumptions.weeklyRampY3;
    const priceInc = isY2 ? assumptions.priceIncreaseY2 : assumptions.priceIncreaseY3;

    const baseRevForYear = lastPeriod.revenue * growthFactor;
    const baseExpForYear = lastPeriod.expense * expGrowthFactor;
    const baseCOGSForYear = lastPeriod.cogs * growthFactor;

    const periods: MultiYearResult["years"][0]["periods"] = [];
    for (let i = 0; i < NUM_PERIODS; i++) {
      const pn = i + 1;
      // Gradual ramp within the year
      const periodGrowth = 1 + (assumptions.annualRevenueGrowth * (pn / NUM_PERIODS));
      let rev = baseRevForYear * (1 + (pn - 1) * 0.005); // slight monthly growth
      let exp = baseExpForYear * (1 + (pn - 1) * 0.002);
      let cogs = baseCOGSForYear * (1 + (pn - 1) * 0.005);

      // Apply price increase
      if (priceInc > 0) {
        rev *= (1 + priceInc);
      }

      // Apply staff addition
      if (addStaff && pn >= sStart) {
        const rampRev = weeklyRamp * 12 + weeklyRamp * 16 * Math.min(pn - sStart, pn - 1);
        const netRampRev = rampRev * (1 - params.cxRate);
        rev += netRampRev;
        cogs += netRampRev * cogsRatio;
        exp += sCost + netRampRev * variableExpenseRatio;
      }

      const netIncome = rev - cogs - exp;
      periods.push({ period: pn, revenue: rev, cogs, expense: exp, netIncome });
    }

    const totalRevenue = periods.reduce((s, p) => s + p.revenue, 0);
    const totalNetIncome = periods.reduce((s, p) => s + p.netIncome, 0);
    years.push({
      year: yr,
      periods,
      totalRevenue,
      totalNetIncome,
      netMargin: totalRevenue > 0 ? totalNetIncome / totalRevenue : 0,
    });
  }

  return { years };
}
