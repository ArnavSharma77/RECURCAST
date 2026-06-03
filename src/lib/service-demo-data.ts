import type { ServiceName, ServicePeriodData } from "./services";
export type { ServicePeriodData } from "./services";

/**
 * Per-service demo data for Warren (Enviro-Master of St. Louis).
 * Revenue split: Windows ~40%, Refresh ~25%, Sani ~20%, Scrub ~15%
 * Cost allocations match Warren's P&L categories:
 *   - Franchise Fee: 13% of service revenue (allocated proportionally)
 *   - Route/Tech Labor: varies by service (hands-on time differs)
 *   - Vehicle Expense: allocated by route stops (proxy: revenue share)
 *   - COGS: product/chemical costs per service
 *   - Sales, Operating, Overhead: allocated per service
 *
 * AGP = Gross Profit - Franchise Fee - Route Labor - Vehicle Expense
 */

interface ServiceSeed {
  baseRev: number;
  growthRate: number;
  cogsRate: number;
  franchiseFeeRate: number;
  routeLaborRate: number;
  vehicleRate: number;
  laborRate: number;
  salesRate: number;
  opexRate: number;
  overheadRate: number;
}

const SERVICE_SEEDS: Record<ServiceName, ServiceSeed> = {
  windows: {
    baseRev: 108000,
    growthRate: 0.025,
    cogsRate: 0.18,
    franchiseFeeRate: 0.13,
    routeLaborRate: 0.24,
    vehicleRate: 0.045,
    laborRate: 0.28,
    salesRate: 0.05,
    opexRate: 0.12,
    overheadRate: 0.06,
  },
  refresh: {
    baseRev: 67500,
    growthRate: 0.03,
    cogsRate: 0.15,
    franchiseFeeRate: 0.13,
    routeLaborRate: 0.22,
    vehicleRate: 0.04,
    laborRate: 0.30,
    salesRate: 0.06,
    opexRate: 0.10,
    overheadRate: 0.05,
  },
  sani: {
    baseRev: 54000,
    growthRate: 0.035,
    cogsRate: 0.20,
    franchiseFeeRate: 0.13,
    routeLaborRate: 0.26,
    vehicleRate: 0.05,
    laborRate: 0.25,
    salesRate: 0.04,
    opexRate: 0.11,
    overheadRate: 0.05,
  },
  scrub: {
    baseRev: 40500,
    growthRate: 0.02,
    cogsRate: 0.22,
    franchiseFeeRate: 0.13,
    routeLaborRate: 0.25,
    vehicleRate: 0.048,
    laborRate: 0.26,
    salesRate: 0.05,
    opexRate: 0.13,
    overheadRate: 0.06,
  },
  oneoffs: {
    baseRev: 4000,
    growthRate: 0.01,
    cogsRate: 0.25,
    franchiseFeeRate: 0.13,
    routeLaborRate: 0.20,
    vehicleRate: 0.03,
    laborRate: 0.30,
    salesRate: 0.03,
    opexRate: 0.08,
    overheadRate: 0.04,
  },
};

function buildPeriodData(
  periodNum: number,
  dataType: "budget" | "actual" | "forecast",
  revenue: number,
  cogs: number,
  seed: ServiceSeed,
  customerCount: number,
): ServicePeriodData {
  const grossProfit = revenue - cogs;
  const franchiseFee = Math.round(revenue * seed.franchiseFeeRate);
  const routeLabor = Math.round(revenue * seed.routeLaborRate);
  const vehicleExpense = Math.round(revenue * seed.vehicleRate);
  const agp = grossProfit - franchiseFee - routeLabor - vehicleExpense;
  const laborCost = Math.round(revenue * seed.laborRate);
  const salesCost = Math.round(revenue * seed.salesRate);
  const operatingCost = Math.round(revenue * seed.opexRate);
  const overheadCost = Math.round(revenue * seed.overheadRate);
  const totalExpense = laborCost + salesCost + operatingCost + overheadCost;
  const netIncome = agp - salesCost - operatingCost - overheadCost;
  const contributionMargin = revenue > 0 ? netIncome / revenue : 0;

  return {
    periodNum,
    dataType,
    revenue,
    cogs,
    grossProfit,
    franchiseFee,
    routeLabor,
    vehicleExpense,
    agp,
    laborCost,
    salesCost,
    operatingCost,
    overheadCost,
    totalExpense,
    netIncome,
    contributionMargin,
    customerCount,
  };
}

function generateServiceData(
  service: ServiceName,
  periodsCompleted: number
): { budget: ServicePeriodData[]; actuals: ServicePeriodData[]; forecast: ServicePeriodData[] } {
  const seed = SERVICE_SEEDS[service];
  const budget: ServicePeriodData[] = [];
  const actuals: ServicePeriodData[] = [];
  const forecast: ServicePeriodData[] = [];

  const hashCode = service.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  let rng = Math.abs(hashCode);
  function seededRandom() {
    rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
    return rng / 0x7fffffff;
  }
  function sJitter(base: number, pct: number): number {
    return base * (1 + (seededRandom() - 0.5) * 2 * pct);
  }

  for (let p = 1; p <= 13; p++) {
    const growthMultiplier = 1 + seed.growthRate * (p - 1);
    const budgetRev = Math.round(seed.baseRev * growthMultiplier);
    const budgetCogs = Math.round(budgetRev * seed.cogsRate);
    const custCount = Math.round(budgetRev / 350);

    budget.push(buildPeriodData(p, "budget", budgetRev, budgetCogs, seed, custCount));

    if (p <= periodsCompleted) {
      const actualRev = Math.round(sJitter(budgetRev, 0.08));
      const actualCogs = Math.round(sJitter(budgetCogs, 0.10));

      actuals.push(buildPeriodData(p, "actual", actualRev, actualCogs, seed, Math.round(actualRev / 340)));
    }

    const fcRev = Math.round(sJitter(budgetRev, 0.04));
    const fcCogs = Math.round(fcRev * sJitter(seed.cogsRate, 0.03));

    forecast.push(buildPeriodData(p, "forecast", fcRev, fcCogs, seed, Math.round(fcRev / 345)));
  }

  return { budget, actuals, forecast };
}

export function getDemoServiceData(periodsCompleted: number = 5): Record<ServiceName, {
  budget: ServicePeriodData[];
  actuals: ServicePeriodData[];
  forecast: ServicePeriodData[];
}> {
  return {
    windows: generateServiceData("windows", periodsCompleted),
    refresh: generateServiceData("refresh", periodsCompleted),
    sani: generateServiceData("sani", periodsCompleted),
    scrub: generateServiceData("scrub", periodsCompleted),
    oneoffs: generateServiceData("oneoffs", periodsCompleted),
  };
}

export function getRollingServiceForecast(
  actuals: ServicePeriodData[],
  forecast: ServicePeriodData[],
  periodsCompleted: number
): ServicePeriodData[] {
  return Array.from({ length: 13 }, (_, i) => {
    if (i < periodsCompleted && actuals[i]) return actuals[i];
    if (forecast[i]) return forecast[i];
    return buildPeriodData(
      i + 1, "forecast", 0, 0,
      SERVICE_SEEDS.windows, 0,
    );
  });
}
