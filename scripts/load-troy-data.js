/**
 * Loads Troy's EMU (Enviro-Master of Utah) data into Supabase tables:
 *   - service_period_data (per service, per period, budget + actual)
 *   - company_expenses (company-wide sales/operating/overhead)
 *
 * Data sourced from: 2026 Forecast 13 periods Enviro-Master.xlsx
 * Service mapping:
 *   Sani = Sani Service + Environmental + Baby Changing + Air Freshener + Hand Sanitizer + Drain + Virus Vaporizer
 *   Scrub = Scrub Revenue
 *   Windows = Service Revenue - Other
 *   Non-Restroom = Non-Restroom
 *   Refresh = N/A (not offered)
 *   One-Offs = N/A
 *
 * Usage: node scripts/load-troy-data.js
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

const CLIENT_ID = "ee4be6cd-d8e8-40fd-b065-4ba556cb3395";
const PERIODS_COMPLETED = 4;

// ===== BUDGET REVENUE (net of cancellations, proportionally allocated) =====
const BUDGET_REV = {
  sani:       [86258, 95842, 99958, 99958, 104073, 113675, 113675, 123278, 123278, 123278, 123278, 123278, 123278],
  scrub:      [37484, 41649, 43427, 43427, 45205, 49353, 49353, 53501, 53501, 53501, 53501, 53501, 53501],
  windows:    [3157, 3508, 3650, 3650, 3792, 4123, 4123, 4455, 4455, 4455, 4455, 4455, 4455],
  nonrestroom:[0, 0, 1, 1, 1, 3, 3, 4, 4, 4, 4, 4, 4],
  refresh:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  oneoffs:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

// ===== ACTUAL REVENUE (4 periods) =====
const ACTUAL_REV = {
  sani:       [99742, 102549, 102727, 99456],
  scrub:      [42007, 45047, 36372, 41083],
  windows:    [3294, 3305, 3262, 3287],
  nonrestroom:[0, 0, 0, 1050],
  refresh:    [0, 0, 0, 0],
  oneoffs:    [0, 0, 0, 0],
};

// ===== ACTUAL COGS =====
// Product COGS allocated to sani (products are for sani/restroom customers)
// Service COGS allocated to sani (row 47 = COGS Sani)
const ACTUAL_COGS = {
  sani:       [20641, 19004, 16767, 18538],
  scrub:      [0, 0, 0, 0],
  windows:    [0, 0, 0, 0],
  nonrestroom:[0, 0, 0, 0],
  refresh:    [0, 0, 0, 0],
  oneoffs:    [0, 0, 0, 0],
};

// ===== ACTUAL LABOR =====
// Sani Team (row 101) + Route Supervisor share → Sani
// Scrub Team (row 109) + Route Supervisor share → Scrub
// Utility Team (row 117) → Windows/Other
const ACTUAL_LABOR = {
  sani:       [39235 + 3836, 26746 + 3500, 24646 + 3500, 23016 + 3500],
  scrub:      [16538 + 1643, 8537 + 1500, 8041 + 1500, 9065 + 1500],
  windows:    [3698, 3840, 3138, 3840],
  nonrestroom:[0, 0, 0, 0],
  refresh:    [0, 0, 0, 0],
  oneoffs:    [0, 0, 0, 0],
};

// ===== ACTUAL FRANCHISE FEE (total company) =====
const ACTUAL_FRANCHISE_TOTAL = [26629, 27536, 26248, 26385];

// ===== ACTUAL VEHICLE EXPENSE (total company) =====
const ACTUAL_VEHICLE_TOTAL = [2483, 1748, 7313, 1886];

// ===== COMPANY-WIDE EXPENSES =====
// Sales expense = Admin Labor + Sales Labor
const ACTUAL_SALES_EXPENSE = [18425 + 5364, 18785 + 4622, 16815 + 5266, 13184 + 5650];
// Operating expense = Office Expenses + Other Operating (excluding auto)
const ACTUAL_OPERATING_EXPENSE = [4843 + 19919, 4800 + 34705, 7122 + 14406, 6951 + 18440];
// Overhead = Vehicle/Auto expense (company level)
const ACTUAL_OVERHEAD_EXPENSE = [2483, 1748, 7313, 1886];

// Budget versions (13 periods)
// Sales = Admin Labor (18386) + Sales Labor
const BUDGET_SALES_EXPENSE = [18386+5141, 18386+5141, 18386+9533, 18386+9533, 18386+14156, 18386+15430, 18386+15430, 18386+16704, 18386+16704, 18386+16704, 18386+16704, 18386+16704, 18386+16704];
// Operating = Office (6148) + Other Operating (19825)
const BUDGET_OPERATING_EXPENSE = Array(13).fill(6148 + 19825);
// Overhead = Auto expense
const BUDGET_OVERHEAD_EXPENSE = Array(13).fill(3680);

// Cost allocation rules for Troy's services (same structure as Warren's)
const COST_RULES = {
  sani:        { cogsRate: 0.14, franchiseFeeRate: 0.13, laborRate: 0.30, fuelRate: 0.03, fuelBasis: "revenue" },
  scrub:       { cogsRate: 0.0, franchiseFeeRate: 0.13, laborRate: 0.25, fuelRate: 0.02, fuelBasis: "revenue" },
  windows:     { cogsRate: 0.0, franchiseFeeRate: 0.13, laborRate: 0.80, fuelRate: 0.05, fuelBasis: "revenue" },
  nonrestroom: { cogsRate: 0.0, franchiseFeeRate: 0.13, laborRate: 0.35, fuelRate: 0.05, fuelBasis: "revenue" },
  refresh:     { cogsRate: 0, franchiseFeeRate: 0, laborRate: 0, fuelRate: 0, fuelBasis: "revenue" },
  oneoffs:     { cogsRate: 0, franchiseFeeRate: 0, laborRate: 0, fuelRate: 0, fuelBasis: "revenue" },
};

const SERVICES = ["sani", "scrub", "windows", "nonrestroom", "refresh", "oneoffs"];

function buildBudgetRow(service, periodIdx) {
  const rev = BUDGET_REV[service][periodIdx];
  const rules = COST_RULES[service];
  const cogs = Math.round(rev * rules.cogsRate);
  const franchiseFee = Math.round(rev * rules.franchiseFeeRate);
  const labor = Math.round(rev * rules.laborRate);
  const fuel = rules.fuelBasis === "labor"
    ? Math.round(labor * rules.fuelRate)
    : Math.round(rev * rules.fuelRate);

  return {
    client_id: CLIENT_ID,
    service_name: service,
    period_num: periodIdx + 1,
    data_type: "budget",
    revenue: rev,
    cogs,
    franchise_fee: franchiseFee,
    route_labor: labor,
    vehicle_expense: fuel,
  };
}

function buildActualRow(service, periodIdx) {
  const rev = ACTUAL_REV[service][periodIdx];
  const cogs = ACTUAL_COGS[service][periodIdx];
  const totalLabor = ACTUAL_LABOR[service][periodIdx];

  const totalActualRev = SERVICES.reduce((sum, s) => sum + (ACTUAL_REV[s][periodIdx] || 0), 0);
  const revShare = totalActualRev > 0 ? rev / totalActualRev : 0;
  const franchiseFee = Math.round(ACTUAL_FRANCHISE_TOTAL[periodIdx] * revShare);
  const vehicleExpense = Math.round(ACTUAL_VEHICLE_TOTAL[periodIdx] * revShare);

  return {
    client_id: CLIENT_ID,
    service_name: service,
    period_num: periodIdx + 1,
    data_type: "actual",
    revenue: rev,
    cogs,
    franchise_fee: franchiseFee,
    route_labor: totalLabor,
    vehicle_expense: vehicleExpense,
  };
}

async function run() {
  console.log(`Loading Troy's EMU data for client: ${CLIENT_ID}`);

  console.log("Clearing existing service_period_data...");
  await sb.from("service_period_data").delete().eq("client_id", CLIENT_ID);
  console.log("Clearing existing company_expenses...");
  await sb.from("company_expenses").delete().eq("client_id", CLIENT_ID);

  const serviceRows = [];
  for (const service of SERVICES) {
    for (let p = 0; p < 13; p++) {
      serviceRows.push(buildBudgetRow(service, p));
    }
    for (let p = 0; p < PERIODS_COMPLETED; p++) {
      serviceRows.push(buildActualRow(service, p));
    }
  }

  console.log(`Inserting ${serviceRows.length} service_period_data rows...`);
  const { error: spdErr } = await sb.from("service_period_data").insert(serviceRows);
  if (spdErr) {
    console.error("Error inserting service_period_data:", spdErr.message);
    process.exit(1);
  }
  console.log("  service_period_data loaded.");

  const expenseRows = [];
  for (let p = 0; p < 13; p++) {
    expenseRows.push({
      client_id: CLIENT_ID,
      period_num: p + 1,
      data_type: "budget",
      sales_expense: BUDGET_SALES_EXPENSE[p],
      operating_expense: BUDGET_OPERATING_EXPENSE[p],
      overhead_expense: BUDGET_OVERHEAD_EXPENSE[p],
    });
  }
  for (let p = 0; p < PERIODS_COMPLETED; p++) {
    expenseRows.push({
      client_id: CLIENT_ID,
      period_num: p + 1,
      data_type: "actual",
      sales_expense: ACTUAL_SALES_EXPENSE[p],
      operating_expense: ACTUAL_OPERATING_EXPENSE[p],
      overhead_expense: ACTUAL_OVERHEAD_EXPENSE[p],
    });
  }

  console.log(`Inserting ${expenseRows.length} company_expenses rows...`);
  const { error: ceErr } = await sb.from("company_expenses").insert(expenseRows);
  if (ceErr) {
    console.error("Error inserting company_expenses:", ceErr.message);
    process.exit(1);
  }
  console.log("  company_expenses loaded.");

  const { count: spdCount } = await sb.from("service_period_data").select("*", { count: "exact", head: true }).eq("client_id", CLIENT_ID);
  const { count: ceCount } = await sb.from("company_expenses").select("*", { count: "exact", head: true }).eq("client_id", CLIENT_ID);
  console.log(`\nVerification: ${spdCount} service rows, ${ceCount} expense rows for client ${CLIENT_ID}`);
  console.log("Done!");
}

run().catch(err => { console.error(err); process.exit(1); });
