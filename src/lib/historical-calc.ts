/**
 * Auto-calculate financial percentages from historical P&L data.
 * Addresses Warren's concern: "The more we can utilize historical information
 * and only need input for changes will make it a lot more attractive."
 */
import type { PeriodData } from "./model";

export interface DerivedMetrics {
  cxRate: number;
  agpMargin: number;
  cogsRatio: number;
  expenseRatio: number;
  avgRevenuePerPeriod: number;
  revenueGrowthRate: number;
  productMix: number;     // product rev as % of total
  serviceMix: number;
  installMix: number;
  tripMix: number;
}

export function deriveMetricsFromHistory(actuals: PeriodData[]): DerivedMetrics {
  if (actuals.length === 0) {
    return defaultMetrics();
  }

  const totalIncome = actuals.reduce((s, p) => s + p.totalIncome, 0);
  const totalCOGS = actuals.reduce((s, p) => s + p.totalCOGS, 0);
  const totalExpense = actuals.reduce((s, p) => s + p.totalExpense, 0);
  const totalAGP = actuals.reduce((s, p) => s + p.adjGrossProfit, 0);
  const totalProduct = actuals.reduce((s, p) => s + p.productRev, 0);
  const totalService = actuals.reduce((s, p) => s + p.serviceRev, 0);
  const totalInstall = actuals.reduce((s, p) => s + p.installRev, 0);
  const totalTrip = actuals.reduce((s, p) => s + p.tripRev, 0);

  const cogsRatio = totalIncome > 0 ? totalCOGS / totalIncome : 0.20;
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 0.55;
  const agpMargin = totalIncome > 0 ? totalAGP / totalIncome : 0.50;

  const avgRevenuePerPeriod = totalIncome / actuals.length;

  let revenueGrowthRate = 0;
  if (actuals.length >= 2) {
    const firstHalf = actuals.slice(0, Math.floor(actuals.length / 2));
    const secondHalf = actuals.slice(Math.floor(actuals.length / 2));
    const firstAvg = firstHalf.reduce((s, p) => s + p.totalIncome, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, p) => s + p.totalIncome, 0) / secondHalf.length;
    revenueGrowthRate = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
  }

  // Cancellation rate estimation from service revenue trends
  let cxRate = 0.10; // default
  if (actuals.length >= 3) {
    const serviceRevs = actuals.map(p => p.serviceRev);
    const expectedGrowth = serviceRevs[0] * 0.05; // assume 5% organic
    const actualGrowth = (serviceRevs[serviceRevs.length - 1] - serviceRevs[0]) / serviceRevs.length;
    const impliedCx = expectedGrowth > 0 ? Math.max(0, 1 - actualGrowth / expectedGrowth) : 0.10;
    cxRate = Math.min(Math.max(impliedCx, 0.02), 0.30); // clamp 2-30%
  }

  return {
    cxRate,
    agpMargin,
    cogsRatio,
    expenseRatio,
    avgRevenuePerPeriod,
    revenueGrowthRate,
    productMix: totalIncome > 0 ? totalProduct / totalIncome : 0.08,
    serviceMix: totalIncome > 0 ? totalService / totalIncome : 0.80,
    installMix: totalIncome > 0 ? totalInstall / totalIncome : 0.04,
    tripMix: totalIncome > 0 ? totalTrip / totalIncome : 0.06,
  };
}

function defaultMetrics(): DerivedMetrics {
  return {
    cxRate: 0.10,
    agpMargin: 0.50,
    cogsRatio: 0.20,
    expenseRatio: 0.55,
    avgRevenuePerPeriod: 300000,
    revenueGrowthRate: 0.05,
    productMix: 0.08,
    serviceMix: 0.80,
    installMix: 0.04,
    tripMix: 0.06,
  };
}

/**
 * Parse a CSV string into period data.
 * Expects columns: Period, Product Rev, Service Rev, Install Rev, Trip Rev,
 * Total Income, Total COGS, Gross Profit, Total Expense, Net Income, AGP
 */
export function parseCSVToPeriods(csv: string): PeriodData[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
  const periods: PeriodData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    if (cols.length < 6) continue;

    const getCol = (keywords: string[]): number => {
      const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
      return idx >= 0 ? parseFloat(cols[idx]) || 0 : 0;
    };

    periods.push({
      productRev: getCol(["product"]),
      serviceRev: getCol(["service"]),
      installRev: getCol(["install"]),
      tripRev: getCol(["trip"]),
      totalIncome: getCol(["total income", "total rev", "revenue"]),
      totalCOGS: getCol(["cogs", "cost of goods"]),
      grossProfit: getCol(["gross profit"]),
      totalExpense: getCol(["expense", "total expense"]),
      netIncome: getCol(["net income", "net profit"]),
      adjGrossProfit: getCol(["agp", "adj gross", "adjusted gross"]),
    });
  }

  return periods;
}

/**
 * Generate a full 13-period forecast from derived metrics and actuals.
 */
export function generateForecastFromMetrics(
  actuals: PeriodData[],
  metrics: DerivedMetrics,
  totalPeriods: number = 13
): PeriodData[] {
  const forecast: PeriodData[] = [...actuals];
  const lastActual = actuals[actuals.length - 1] ?? {
    totalIncome: metrics.avgRevenuePerPeriod,
  };

  for (let i = actuals.length; i < totalPeriods; i++) {
    const growthFactor = 1 + (metrics.revenueGrowthRate / totalPeriods);
    const prevIncome = forecast[i - 1]?.totalIncome ?? lastActual.totalIncome;
    const projectedIncome = prevIncome * growthFactor;

    const productRev = projectedIncome * metrics.productMix;
    const serviceRev = projectedIncome * metrics.serviceMix;
    const installRev = projectedIncome * metrics.installMix;
    const tripRev = projectedIncome * metrics.tripMix;
    const totalCOGS = projectedIncome * metrics.cogsRatio;
    const grossProfit = projectedIncome - totalCOGS;
    const totalExpense = projectedIncome * metrics.expenseRatio;
    const netIncome = grossProfit - totalExpense;
    const adjGrossProfit = projectedIncome * metrics.agpMargin;

    forecast.push({
      productRev, serviceRev, installRev, tripRev,
      totalIncome: projectedIncome, totalCOGS, grossProfit,
      totalExpense, netIncome, adjGrossProfit,
    });
  }

  return forecast;
}
