import type { ServiceName, ServicePeriodData } from "./services";
export type { ServicePeriodData } from "./services";

/**
 * Realistic per-service demo data for Warren (Enviro-Master of St. Louis).
 * Based on ~$270K total revenue/period, split:
 * Windows ~40%, Refresh ~25%, Sani ~20%, Scrub ~15%
 * 5 periods of actuals, remainder is forecast/budget.
 */

interface ServiceSeed {
  baseRev: number;
  growthRate: number;
  cogsRate: number;
  laborRate: number;
  salesRate: number;
  opexRate: number;
  overheadRate: number;
  agpRate: number;
}

const SERVICE_SEEDS: Record<ServiceName, ServiceSeed> = {
  windows: {
    baseRev: 108000,
    growthRate: 0.025,
    cogsRate: 0.18,
    laborRate: 0.28,
    salesRate: 0.05,
    opexRate: 0.12,
    overheadRate: 0.06,
    agpRate: 0.42,
  },
  refresh: {
    baseRev: 67500,
    growthRate: 0.03,
    cogsRate: 0.15,
    laborRate: 0.30,
    salesRate: 0.06,
    opexRate: 0.10,
    overheadRate: 0.05,
    agpRate: 0.45,
  },
  sani: {
    baseRev: 54000,
    growthRate: 0.035,
    cogsRate: 0.20,
    laborRate: 0.25,
    salesRate: 0.04,
    opexRate: 0.11,
    overheadRate: 0.05,
    agpRate: 0.40,
  },
  scrub: {
    baseRev: 40500,
    growthRate: 0.02,
    cogsRate: 0.22,
    laborRate: 0.26,
    salesRate: 0.05,
    opexRate: 0.13,
    overheadRate: 0.06,
    agpRate: 0.38,
  },
  oneoffs: {
    baseRev: 4000,
    growthRate: 0.01,
    cogsRate: 0.25,
    laborRate: 0.30,
    salesRate: 0.03,
    opexRate: 0.08,
    overheadRate: 0.04,
    agpRate: 0.35,
  },
};

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function generateServiceData(
  service: ServiceName,
  periodsCompleted: number
): { budget: ServicePeriodData[]; actuals: ServicePeriodData[]; forecast: ServicePeriodData[] } {
  const seed = SERVICE_SEEDS[service];
  const budget: ServicePeriodData[] = [];
  const actuals: ServicePeriodData[] = [];
  const forecast: ServicePeriodData[] = [];

  // Use a fixed pseudo-random seed based on service name for reproducibility
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
    const budgetGP = budgetRev - budgetCogs;
    const budgetAGP = Math.round(budgetRev * seed.agpRate);
    const budgetLabor = Math.round(budgetRev * seed.laborRate);
    const budgetSales = Math.round(budgetRev * seed.salesRate);
    const budgetOpex = Math.round(budgetRev * seed.opexRate);
    const budgetOverhead = Math.round(budgetRev * seed.overheadRate);

    budget.push({
      periodNum: p,
      dataType: "budget",
      revenue: budgetRev,
      cogs: budgetCogs,
      grossProfit: budgetGP,
      agp: budgetAGP,
      laborCost: budgetLabor,
      salesCost: budgetSales,
      operatingCost: budgetOpex,
      overheadCost: budgetOverhead,
      customerCount: Math.round(budgetRev / 350),
    });

    if (p <= periodsCompleted) {
      const actualRev = Math.round(sJitter(budgetRev, 0.08));
      const actualCogs = Math.round(sJitter(budgetCogs, 0.10));
      const actualGP = actualRev - actualCogs;
      const actualAGP = Math.round(actualRev * sJitter(seed.agpRate, 0.05));
      const actualLabor = Math.round(sJitter(budgetLabor, 0.12));
      const actualSales = Math.round(sJitter(budgetSales, 0.15));
      const actualOpex = Math.round(sJitter(budgetOpex, 0.10));
      const actualOverhead = Math.round(sJitter(budgetOverhead, 0.08));

      actuals.push({
        periodNum: p,
        dataType: "actual",
        revenue: actualRev,
        cogs: actualCogs,
        grossProfit: actualGP,
        agp: actualAGP,
        laborCost: actualLabor,
        salesCost: actualSales,
        operatingCost: actualOpex,
        overheadCost: actualOverhead,
        customerCount: Math.round(actualRev / 340),
      });
    }

    // Forecast: slightly adjusted from budget
    const fcRev = Math.round(sJitter(budgetRev, 0.04));
    const fcCogs = Math.round(fcRev * sJitter(seed.cogsRate, 0.03));
    forecast.push({
      periodNum: p,
      dataType: "forecast",
      revenue: fcRev,
      cogs: fcCogs,
      grossProfit: fcRev - fcCogs,
      agp: Math.round(fcRev * seed.agpRate),
      laborCost: Math.round(fcRev * sJitter(seed.laborRate, 0.03)),
      salesCost: Math.round(fcRev * seed.salesRate),
      operatingCost: Math.round(fcRev * seed.opexRate),
      overheadCost: Math.round(fcRev * seed.overheadRate),
      customerCount: Math.round(fcRev / 345),
    });
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
    return {
      periodNum: i + 1,
      dataType: "forecast" as const,
      revenue: 0, cogs: 0, grossProfit: 0, agp: 0,
      laborCost: 0, salesCost: 0, operatingCost: 0, overheadCost: 0, customerCount: 0,
    };
  });
}
