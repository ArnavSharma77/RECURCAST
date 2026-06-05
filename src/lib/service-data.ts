import { supabase } from "@/lib/supabase/client";
import type { ServicePeriodDataRow, CompanyExpensesRow } from "@/lib/supabase/types";
import type { ServiceName, ServicePeriodData } from "@/lib/services";

export type { ServicePeriodData } from "./services";

export interface CompanyExpensePeriod {
  period: number;
  sales: number;
  operating: number;
  overhead: number;
}

function rowToServicePeriod(row: ServicePeriodDataRow): ServicePeriodData {
  const { revenue, cogs, franchise_fee, route_labor, vehicle_expense, period_num, data_type } = row;
  const grossProfit = revenue - cogs;
  const agp = grossProfit - franchise_fee - route_labor - vehicle_expense;
  const laborCost = route_labor + vehicle_expense;
  const totalExpense = cogs + franchise_fee + laborCost;
  const netIncome = agp;
  const contributionMargin = revenue > 0 ? netIncome / revenue : 0;

  return {
    periodNum: period_num,
    dataType: data_type as "budget" | "actual" | "forecast",
    revenue,
    cogs,
    grossProfit,
    franchiseFee: franchise_fee,
    routeLabor: route_labor,
    vehicleExpense: vehicle_expense,
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

export type ServiceDataResult = Record<ServiceName, {
  budget: ServicePeriodData[];
  actuals: ServicePeriodData[];
  forecast: ServicePeriodData[];
}>;

/**
 * Fetches per-service period data from Supabase for a given client.
 * Returns null if no data exists.
 */
export async function getClientServiceData(clientId: string): Promise<ServiceDataResult | null> {
  const { data: rows, error } = await supabase
    .from("service_period_data")
    .select("*")
    .eq("client_id", clientId)
    .order("period_num", { ascending: true });

  if (error || !rows || rows.length === 0) return null;

  const result: Record<string, { budget: ServicePeriodData[]; actuals: ServicePeriodData[]; forecast: ServicePeriodData[] }> = {};

  for (const row of rows as ServicePeriodDataRow[]) {
    const svc = row.service_name;
    if (!result[svc]) {
      result[svc] = { budget: [], actuals: [], forecast: [] };
    }

    const period = rowToServicePeriod(row);

    if (row.data_type === "budget") {
      result[svc].budget.push(period);
      result[svc].forecast.push({ ...period, dataType: "forecast" });
    } else if (row.data_type === "actual") {
      result[svc].actuals.push(period);
    }
  }

  return result as ServiceDataResult;
}

/**
 * Fetches company-wide expenses for a given client from Supabase.
 * Returns null if no data exists.
 */
export async function getClientCompanyExpenses(clientId: string): Promise<{
  budget: CompanyExpensePeriod[];
  actuals: CompanyExpensePeriod[];
} | null> {
  const { data: rows, error } = await supabase
    .from("company_expenses")
    .select("*")
    .eq("client_id", clientId)
    .order("period_num", { ascending: true });

  if (error || !rows || rows.length === 0) return null;

  const budget: CompanyExpensePeriod[] = [];
  const actuals: CompanyExpensePeriod[] = [];

  for (const row of rows as CompanyExpensesRow[]) {
    const entry: CompanyExpensePeriod = {
      period: row.period_num,
      sales: row.sales_expense,
      operating: row.operating_expense,
      overhead: row.overhead_expense,
    };

    if (row.data_type === "budget") {
      budget.push(entry);
    } else {
      actuals.push(entry);
    }
  }

  return { budget, actuals };
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
      revenue: 0, cogs: 0, grossProfit: 0, franchiseFee: 0,
      routeLabor: 0, vehicleExpense: 0, agp: 0, laborCost: 0,
      salesCost: 0, operatingCost: 0, overheadCost: 0,
      totalExpense: 0, netIncome: 0, contributionMargin: 0, customerCount: 0,
    };
  });
}
