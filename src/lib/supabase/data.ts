import { supabase } from "./client";
import type { ClientRow, PeriodDataRow } from "./types";
import type { ClientParameters, PeriodData } from "../model";

function toPeriodData(row: PeriodDataRow): PeriodData {
  return {
    productRev: Number(row.product_rev),
    serviceRev: Number(row.service_rev),
    installRev: Number(row.install_rev),
    tripRev: Number(row.trip_rev),
    totalIncome: Number(row.total_income),
    totalCOGS: Number(row.total_cogs),
    grossProfit: Number(row.gross_profit),
    totalExpense: Number(row.total_expense),
    netIncome: Number(row.net_income),
    adjGrossProfit: Number(row.adj_gross_profit),
  };
}

export async function getClientForUser(): Promise<ClientRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as ClientRow;
}

export async function getClientParams(clientId: string): Promise<ClientParameters | null> {
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) return null;
  const c = client as ClientRow;

  return {
    locationName: c.name,
    fiscalYear: c.fiscal_year,
    periodsCompleted: c.periods_completed,
    cxRate: Number(c.cx_rate),
    avgServicePrice: 0,
    tripChargePerCust: 0,
    allocWin: 0,
    allocRef: 0,
    allocSan: 0,
    instRateWin: 0,
    instRateRef: 0,
    instRateSan: 0,
    commissionRate: Number(c.commission_rate),
  };
}

export async function getPeriodData(clientId: string): Promise<{
  budget: PeriodData[];
  actuals: PeriodData[];
  forecast: PeriodData[];
}> {
  const { data, error } = await supabase
    .from("period_data")
    .select("*")
    .eq("client_id", clientId)
    .order("period_num");

  if (error || !data) return { budget: [], actuals: [], forecast: [] };

  const rows = data as PeriodDataRow[];
  const budget: PeriodData[] = [];
  const actuals: PeriodData[] = [];
  const forecast: PeriodData[] = [];

  for (const row of rows) {
    const pd = toPeriodData(row);
    if (row.data_type === "budget") budget.push(pd);
    else if (row.data_type === "actual") actuals.push(pd);
    else if (row.data_type === "forecast") forecast.push(pd);
  }

  return { budget, actuals, forecast };
}

export async function getRollingForecast(clientId: string, periodsCompleted: number): Promise<PeriodData[]> {
  const { budget, actuals, forecast } = await getPeriodData(clientId);

  return Array.from({ length: 13 }, (_, i) => {
    if (i < periodsCompleted && actuals[i]) return actuals[i];
    if (forecast.length === 13) {
      if (forecast[i]) return forecast[i];
    } else {
      const fcIdx = i - periodsCompleted;
      if (fcIdx >= 0 && forecast[fcIdx]) return forecast[fcIdx];
    }
    if (budget[i]) return budget[i];
    return { productRev: 0, serviceRev: 0, installRev: 0, tripRev: 0, totalIncome: 0, totalCOGS: 0, grossProfit: 0, totalExpense: 0, netIncome: 0, adjGrossProfit: 0 };
  });
}

export async function getCustomerCounts(clientId: string): Promise<number[]> {
  const { data } = await supabase
    .from("period_data")
    .select("period_num, customer_count")
    .eq("client_id", clientId)
    .eq("data_type", "budget")
    .order("period_num");

  if (!data) return Array(13).fill(0);
  return data.map((r: { customer_count: number | null }) => r.customer_count ?? 0);
}

export async function updatePeriodsCompleted(clientId: string, periods: number): Promise<void> {
  await supabase
    .from("clients")
    .update({ periods_completed: periods })
    .eq("id", clientId);
}

export async function upsertActual(clientId: string, periodNum: number, data: PeriodData, customerCount?: number): Promise<void> {
  await supabase
    .from("period_data")
    .upsert({
      client_id: clientId,
      period_num: periodNum,
      data_type: "actual" as const,
      product_rev: data.productRev,
      service_rev: data.serviceRev,
      install_rev: data.installRev,
      trip_rev: data.tripRev,
      total_income: data.totalIncome,
      total_cogs: data.totalCOGS,
      gross_profit: data.grossProfit,
      total_expense: data.totalExpense,
      net_income: data.netIncome,
      adj_gross_profit: data.adjGrossProfit,
      customer_count: customerCount ?? null,
    }, { onConflict: "client_id,period_num,data_type" });
}
