const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { error: checkErr } = await sb
    .from("service_period_data")
    .select("id")
    .limit(1);

  if (checkErr && checkErr.message.includes("does not exist")) {
    console.log("Table does not exist. Need to create it via Supabase dashboard SQL editor.");
    console.log("SQL to run:");
    console.log(`
CREATE TABLE service_period_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (service_name IN ('windows', 'refresh', 'sani', 'scrub')),
  period_num INTEGER NOT NULL CHECK (period_num >= 1 AND period_num <= 13),
  data_type TEXT NOT NULL CHECK (data_type IN ('budget', 'actual', 'forecast')),
  revenue NUMERIC DEFAULT 0,
  cogs NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  agp NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  sales_cost NUMERIC DEFAULT 0,
  operating_cost NUMERIC DEFAULT 0,
  overhead_cost NUMERIC DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, service_name, period_num, data_type)
);

ALTER TABLE service_period_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service key" ON service_period_data FOR ALL USING (true);
    `);
  } else if (checkErr) {
    console.log("Error checking table:", checkErr.message);
  } else {
    console.log("Table already exists!");
  }
}

run();
