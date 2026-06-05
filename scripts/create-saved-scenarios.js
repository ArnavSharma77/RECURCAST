const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://sphewklcsrgpwwdjeorv.supabase.co";
const SERVICE_KEY = "sb_secret_7KBN9YfJM413d5xzDoGqKQ_4m76uAcj";

async function run() {
  // Use the Supabase SQL endpoint (available to service role)
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

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "exec_sql", params: { sql } }),
  });

  // Alternative: use the pg_net or direct SQL approach via supabase-js
  // Since PostgREST doesn't support DDL, let's use the Supabase Management API
  const mgmtResp = await fetch(`https://api.supabase.com/v1/projects/sphewklcsrgpwwdjeorv/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (mgmtResp.ok) {
    const result = await mgmtResp.json();
    console.log("Migration applied successfully:", result);
  } else {
    const text = await mgmtResp.text();
    console.log("Management API status:", mgmtResp.status, text.substring(0, 300));
    
    // Fallback: try via supabase-js rpc
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await sb.rpc("exec_sql", { query: sql });
    if (error) {
      console.log("RPC also failed:", error.message);
      console.log("\n=== MANUAL SQL (run in Supabase Dashboard > SQL Editor) ===\n");
      console.log(sql);
    } else {
      console.log("Applied via RPC successfully");
    }
  }
}

run().catch(e => console.error("Error:", e.message));
