export interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  fiscal_year: number;
  periods_completed: number;
  num_periods: number;
  cx_rate: number;
  agp_margin: number;
  commission_rate: number;
  franchise_fee_rate: number;
  weekly_sales_rate: number;
  customer_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface PeriodDataRow {
  id: string;
  client_id: string;
  period_num: number;
  data_type: "budget" | "actual" | "forecast";
  product_rev: number;
  service_rev: number;
  install_rev: number;
  trip_rev: number;
  total_income: number;
  total_cogs: number;
  gross_profit: number;
  total_expense: number;
  net_income: number;
  adj_gross_profit: number;
  customer_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ModelParamsRow {
  id: string;
  client_id: string;
  effective_from: string;
  cx_rate: number | null;
  agp_margin: number | null;
  commission_rate: number | null;
  franchise_fee_rate: number | null;
  avg_weekly_rev_per_cust: number | null;
  notes: string | null;
  created_at: string;
}
