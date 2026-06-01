-- RecurCast Database Schema
-- Run this migration in Supabase SQL Editor or via CLI

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  tier text NOT NULL DEFAULT 'growth' CHECK (tier IN ('essentials','growth','premium')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL DEFAULT 2026,
  periods_completed int NOT NULL DEFAULT 0,
  cx_rate numeric NOT NULL DEFAULT 0.10,
  avg_service_price numeric NOT NULL DEFAULT 480,
  trip_charge_per_cust numeric NOT NULL DEFAULT 10,
  alloc_win numeric NOT NULL DEFAULT 0.30,
  alloc_ref numeric NOT NULL DEFAULT 0.40,
  alloc_san numeric NOT NULL DEFAULT 0.30,
  inst_rate_win numeric NOT NULL DEFAULT 2.0,
  inst_rate_ref numeric NOT NULL DEFAULT 0.10,
  inst_rate_san numeric NOT NULL DEFAULT 0.50,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, fiscal_year)
);

CREATE TABLE IF NOT EXISTS periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_num int NOT NULL CHECK (period_num BETWEEN 1 AND 13),
  is_actual boolean NOT NULL DEFAULT false,
  product_rev numeric DEFAULT 0,
  service_rev numeric DEFAULT 0,
  install_rev numeric DEFAULT 0,
  trip_rev numeric DEFAULT 0,
  total_income numeric DEFAULT 0,
  total_cogs numeric DEFAULT 0,
  gross_profit numeric DEFAULT 0,
  total_expense numeric DEFAULT 0,
  net_income numeric DEFAULT 0,
  adj_gross_profit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, period_num)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Scenario 1',
  ramp_values jsonb NOT NULL DEFAULT '[]',
  staff_cost numeric NOT NULL DEFAULT 0,
  staff_start int NOT NULL DEFAULT 1,
  cx_override numeric,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own data
CREATE POLICY clients_owner ON clients FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY parameters_owner ON parameters FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY periods_owner ON periods FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY scenarios_owner ON scenarios FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
