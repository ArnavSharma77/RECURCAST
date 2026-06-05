import type { ServiceName, ServicePeriodData } from "./services";
export type { ServicePeriodData } from "./services";

/**
 * REAL data from Warren's Budget 2026 - Dashboard v12 spreadsheet.
 * Budget numbers from Cx sheet, Actuals from Actuals Input sheet.
 * Cost allocation per Warren (Jun 2026):
 *   Sani: COGS(3%), 13% franchise, labor(23%), sani fuel(10% of labor)
 *   Windows/RPM: COGS(2%), 13% franchise, labor(30%), fuel(3%)
 *   Refresh: COGS(5%), 13% franchise, labor(20%)
 *   Scrub: COGS(1%), 13% franchise, labor(23%)
 *   Non-Restroom: COGS(5%), 13% franchise, labor(35%), fuel(10%)
 *   One-Off: labor(20%) only
 * Sales, Operating, Overhead = company-wide only (NOT per service).
 */

// ===== BUDGET REVENUE per period (Cx sheet) =====
const BUDGET_REV: Record<ServiceName, number[]> = {
  sani:       [124450, 127250, 130330, 133550, 137050, 140830, 144610, 148390, 152170, 155950, 159730, 163510, 167290],
  windows:    [26745, 27945, 29265, 30645, 32145, 33765, 35385, 37005, 38625, 40245, 41865, 43485, 45105],
  refresh:    [19930, 21530, 23290, 25130, 27130, 29290, 31450, 33610, 35770, 37930, 40090, 42250, 44410],
  scrub:      [52505, 54905, 57545, 60305, 63305, 66545, 69785, 73025, 76265, 79505, 82745, 85985, 89225],
  nonrestroom:[2817, 2917, 3017, 3117, 3217, 3317, 3554, 3654, 3754, 3854, 3954, 4054, 4154],
  oneoffs:    [4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000],
};

// ===== ACTUAL REVENUE per period (Actuals Input sheet, 5 periods completed) =====
const ACTUAL_REV: Record<ServiceName, number[]> = {
  sani:       [106983, 112871, 112748, 112148, 113028],
  windows:    [16140, 18589, 22347, 21134, 21276],
  refresh:    [16426, 28052, 22950, 42501, 37358],
  scrub:      [53533, 52420, 50769, 48434, 56218],
  nonrestroom:[0, 0, 0, 0, 0],
  oneoffs:    [0, 0, 38500, 10000, 0],
};

// ===== ACTUAL COGS per period (Actuals Input) =====
const ACTUAL_COGS: Record<ServiceName, number[]> = {
  sani:       [8334, 9085, 2753, 14436, 1983],
  windows:    [0, 373, 0, 1147, 0],
  refresh:    [417, 0, 3364, 231, 20],
  scrub:      [2000, 2050, 2061, 2000, 2000],
  nonrestroom:[50, 50, 50, 50, 50],
  oneoffs:    [0, 0, 0, 0, 0],
};

// ===== ACTUAL LABOR per period (Actuals Input - route labor + fuel) =====
const ACTUAL_LABOR: Record<ServiceName, number[]> = {
  sani:       [32164+4250, 28477+6657, 31914+6127, 36802+6303, 37464+9473],
  windows:    [4000+500, 3000+500, 4000+500, 4000+500, 4000+500],
  refresh:    [0, 13277, 20069, 11764, 10114],
  scrub:      [10160, 10000, 10000, 10000, 10000],
  nonrestroom:[300+40, 300+40, 300+40, 300+40, 300+40],
  oneoffs:    [0, 0, 0, 0, 0],
};

// ===== ACTUAL FRANCHISE FEES (total company, allocate by revenue share) =====
const ACTUAL_FRANCHISE_TOTAL: number[] = [34233, 37804, 43961, 40972, 42100];

// ===== COMPANY-WIDE EXPENSE ACTUALS =====
const ACTUAL_SALES_EXPENSE: number[] = [28158, 35944, 19579, 22328, 26447];
const ACTUAL_OPERATING_EXPENSE: number[] = [22479, 25373, 30160, 28979, 26940];
const ACTUAL_OVERHEAD_EXPENSE: number[] = [7793, 9469, 5766, 6596, 5838];

// Budget versions of company-wide expenses (from Cx sheet)
const BUDGET_SALES_EXPENSE: number[] = [30166, 32246, 33286, 33806, 34846, 36502, 36502, 36502, 36502, 36502, 36502, 36502, 36502];
const BUDGET_OPERATING_EXPENSE: number[] = [22261, 23409, 23409, 23409, 33409, 38409, 23409, 23409, 23409, 23409, 23409, 23409, 23409];
const BUDGET_OVERHEAD_EXPENSE: number[] = [6675, 6675, 6675, 6675, 6675, 6675, 6675, 6675, 6675, 7675, 6675, 6675, 6675];

// Cost rates per Warren's rules
interface CostRules {
  cogsRate: number;
  franchiseFeeRate: number;
  laborRate: number;
  fuelRate: number;
  fuelBasis: "revenue" | "labor";
}

const COST_RULES: Record<ServiceName, CostRules> = {
  sani:        { cogsRate: 0.03, franchiseFeeRate: 0.13, laborRate: 0.23, fuelRate: 0.10, fuelBasis: "labor" },
  windows:     { cogsRate: 0.02, franchiseFeeRate: 0.13, laborRate: 0.30, fuelRate: 0.03, fuelBasis: "revenue" },
  refresh:     { cogsRate: 0.05, franchiseFeeRate: 0.13, laborRate: 0.20, fuelRate: 0,    fuelBasis: "revenue" },
  scrub:       { cogsRate: 0.01, franchiseFeeRate: 0.13, laborRate: 0.23, fuelRate: 0,    fuelBasis: "revenue" },
  nonrestroom: { cogsRate: 0.05, franchiseFeeRate: 0.13, laborRate: 0.35, fuelRate: 0.10, fuelBasis: "revenue" },
  oneoffs:     { cogsRate: 0,    franchiseFeeRate: 0,    laborRate: 0.20, fuelRate: 0,    fuelBasis: "revenue" },
};

function buildPeriodData(
  periodNum: number,
  dataType: "budget" | "actual" | "forecast",
  revenue: number,
  cogs: number,
  franchiseFee: number,
  routeLabor: number,
  vehicleExpense: number,
): ServicePeriodData {
  const grossProfit = revenue - cogs;
  const agp = grossProfit - franchiseFee - routeLabor - vehicleExpense;
  const laborCost = routeLabor + vehicleExpense;
  const totalExpense = cogs + franchiseFee + laborCost;
  const netIncome = agp;
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
    salesCost: 0,
    operatingCost: 0,
    overheadCost: 0,
    totalExpense,
    netIncome,
    contributionMargin,
    customerCount: Math.round(revenue / 350),
  };
}

function buildBudgetPeriod(service: ServiceName, periodIdx: number): ServicePeriodData {
  const rev = BUDGET_REV[service][periodIdx];
  const rules = COST_RULES[service];
  const cogs = Math.round(rev * rules.cogsRate);
  const franchiseFee = Math.round(rev * rules.franchiseFeeRate);
  const labor = Math.round(rev * rules.laborRate);
  const fuel = rules.fuelBasis === "labor"
    ? Math.round(labor * rules.fuelRate)
    : Math.round(rev * rules.fuelRate);

  return buildPeriodData(periodIdx + 1, "budget", rev, cogs, franchiseFee, labor, fuel);
}

function buildActualPeriod(service: ServiceName, periodIdx: number): ServicePeriodData {
  const rev = ACTUAL_REV[service][periodIdx];
  const cogs = ACTUAL_COGS[service][periodIdx];
  const labor = ACTUAL_LABOR[service][periodIdx];

  // Allocate franchise fee proportionally by revenue share
  const totalActualRev = Object.values(ACTUAL_REV).reduce((sum, arr) => sum + (arr[periodIdx] || 0), 0);
  const revShare = totalActualRev > 0 ? rev / totalActualRev : 0;
  const franchiseFee = Math.round(ACTUAL_FRANCHISE_TOTAL[periodIdx] * revShare);

  // Split labor into route vs vehicle (approximate from data)
  const rules = COST_RULES[service];
  const vehiclePortion = rules.fuelBasis === "labor"
    ? Math.round(labor * (rules.fuelRate / (1 + rules.fuelRate)))
    : Math.round(rev * rules.fuelRate);
  const routeLabor = labor - vehiclePortion;

  return buildPeriodData(periodIdx + 1, "actual", rev, cogs, franchiseFee, routeLabor, vehiclePortion);
}

export function getDemoServiceData(periodsCompleted: number = 5): Record<ServiceName, {
  budget: ServicePeriodData[];
  actuals: ServicePeriodData[];
  forecast: ServicePeriodData[];
}> {
  const result: Record<string, { budget: ServicePeriodData[]; actuals: ServicePeriodData[]; forecast: ServicePeriodData[] }> = {};

  for (const service of Object.keys(BUDGET_REV) as ServiceName[]) {
    const budget: ServicePeriodData[] = [];
    const actuals: ServicePeriodData[] = [];
    const forecast: ServicePeriodData[] = [];

    for (let p = 0; p < 13; p++) {
      budget.push(buildBudgetPeriod(service, p));

      if (p < periodsCompleted && p < ACTUAL_REV[service].length) {
        actuals.push(buildActualPeriod(service, p));
      }

      // Forecast = budget for unfinished periods (rolling)
      forecast.push(buildBudgetPeriod(service, p));
    }

    result[service] = { budget, actuals, forecast };
  }

  return result as Record<ServiceName, { budget: ServicePeriodData[]; actuals: ServicePeriodData[]; forecast: ServicePeriodData[] }>;
}

export function getRollingServiceForecast(
  actuals: ServicePeriodData[],
  forecast: ServicePeriodData[],
  periodsCompleted: number
): ServicePeriodData[] {
  return Array.from({ length: 13 }, (_, i) => {
    if (i < periodsCompleted && actuals[i]) return actuals[i];
    if (forecast[i]) return forecast[i];
    return buildPeriodData(i + 1, "forecast", 0, 0, 0, 0, 0);
  });
}

// ===== COMPANY-WIDE EXPENSES (not allocated per service) =====
export interface CompanyExpensePeriod {
  period: number;
  sales: number;
  operating: number;
  overhead: number;
}

export function getCompanyExpenses(periodsCompleted: number = 5): {
  budget: CompanyExpensePeriod[];
  actuals: CompanyExpensePeriod[];
} {
  const budget: CompanyExpensePeriod[] = [];
  const actuals: CompanyExpensePeriod[] = [];

  for (let p = 0; p < 13; p++) {
    budget.push({
      period: p + 1,
      sales: BUDGET_SALES_EXPENSE[p],
      operating: BUDGET_OPERATING_EXPENSE[p],
      overhead: BUDGET_OVERHEAD_EXPENSE[p],
    });

    if (p < periodsCompleted) {
      actuals.push({
        period: p + 1,
        sales: ACTUAL_SALES_EXPENSE[p] || 0,
        operating: ACTUAL_OPERATING_EXPENSE[p] || 0,
        overhead: ACTUAL_OVERHEAD_EXPENSE[p] || 0,
      });
    }
  }

  return { budget, actuals };
}
