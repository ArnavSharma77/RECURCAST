const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

async function run() {
  const sql = `
CREATE TABLE IF NOT EXISTS saved_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scope text NOT NULL DEFAULT 'company' CHECK (scope IN ('company', 'service')),
  service_name text,
  inputs jsonb NOT NULL,
  results_summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_scenarios_client ON saved_scenarios(client_id);

ALTER TABLE saved_scenarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_scenarios' AND policyname = 'anon_select_scenarios') THEN
    CREATE POLICY "anon_select_scenarios" ON saved_scenarios FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_scenarios' AND policyname = 'anon_insert_scenarios') THEN
    CREATE POLICY "anon_insert_scenarios" ON saved_scenarios FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_scenarios' AND policyname = 'anon_delete_scenarios') THEN
    CREATE POLICY "anon_delete_scenarios" ON saved_scenarios FOR DELETE USING (true);
  END IF;
END $$;
  `;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { error } = await sb.rpc("exec_sql", { query: sql });
  if (error) {
    console.log("RPC failed:", error.message);
    console.log("\n=== MANUAL SQL (run in Supabase Dashboard > SQL Editor) ===\n");
    console.log(sql);
    process.exit(1);
  }
  console.log("Migration applied successfully");
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
