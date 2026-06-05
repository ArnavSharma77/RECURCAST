/**
 * Loads Warren's V12 spreadsheet data into Supabase tables:
 *   - service_period_data (per service, per period, budget + actual)
 *   - company_expenses (company-wide sales/operating/overhead)
 *
 * Data sourced from Budget 2026 - Dashboard v12 (1).xlsx
 * Cost allocation rules per Warren (Jun 2026).
 *
 * Usage: node scripts/load-v12-data.js [client_id]
 * Default client_id: d098090e-0d10-4d35-8758-87de54db6830 (Enviro-Master of St. Louis)
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

const CLIENT_ID = process.argv[2] || "d098090e-0d10-4d35-8758-87de54db6830";

// ===== GROSS BUDGET REVENUE per period (Cx sheet top) =====
const GROSS_BUDGET_REV = {
  sani:       [124450, 127250, 130330, 133550, 137050, 140830, 144610, 148390, 152170, 155950, 159730, 163510, 167290],
  windows:    [26745, 27945, 29265, 30645, 32145, 33765, 35385, 37005, 38625, 40245, 41865, 43485, 45105],
  refresh:    [19930, 21530, 23290, 25130, 27130, 29290, 31450, 33610, 35770, 37930, 40090, 42250, 44410],
  scrub:      [52505, 54905, 57545, 60305, 63305, 66545, 69785, 73025, 76265, 79505, 82745, 85985, 89225],
  nonrestroom:[2817, 2917, 3017, 3117, 3217, 3317, 3554, 3654, 3754, 3854, 3954, 4054, 4154],
  oneoffs:    [4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000],
};

// ===== PER-SERVICE CANCELLATIONS per period (Cx sheet rows 271-282) =====
const CANCELLATIONS = {
  sani:       [24890, 25450, 26066, 26710, 27410, 28166, 28922, 29678, 30434, 31190, 31946, 32702, 33458],
  windows:    [5349, 5589, 5853, 6129, 6429, 6753, 7077, 7401, 7725, 8049, 8373, 8697, 9021],
  refresh:    [3986, 4306, 4658, 5026, 5426, 5858, 6290, 6722, 7154, 7586, 8018, 8450, 8882],
  scrub:      [10501, 10981, 11509, 12061, 12661, 13309, 13957, 14605, 15253, 15901, 16549, 17197, 17845],
  nonrestroom:[563, 583, 603, 623, 643, 663, 711, 731, 751, 771, 791, 811, 831],
  oneoffs:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

// ===== NET BUDGET REVENUE = Gross - Cancellations =====
const BUDGET_REV = {};
for (const svc of Object.keys(GROSS_BUDGET_REV)) {
  BUDGET_REV[svc] = GROSS_BUDGET_REV[svc].map((rev, i) => rev - CANCELLATIONS[svc][i]);
}

// ===== ACTUAL REVENUE per period (5 periods completed) =====
const ACTUAL_REV = {
  sani:       [106983, 112871, 112748, 112148, 113028],
  windows:    [16140, 18589, 22347, 21134, 21276],
  refresh:    [16426, 28052, 22950, 42501, 37358],
  scrub:      [53533, 52420, 50769, 48434, 56218],
  nonrestroom:[0, 0, 0, 0, 0],
  oneoffs:    [0, 0, 38500, 10000, 0],
};

// ===== ACTUAL COGS =====
const ACTUAL_COGS = {
  sani:       [8334, 9085, 2753, 14436, 1983],
  windows:    [0, 373, 0, 1147, 0],
  refresh:    [417, 0, 3364, 231, 20],
  scrub:      [2000, 2050, 2061, 2000, 2000],
  nonrestroom:[50, 50, 50, 50, 50],
  oneoffs:    [0, 0, 0, 0, 0],
};

// ===== ACTUAL LABOR (route labor + fuel combined) =====
const ACTUAL_LABOR = {
  sani:       [32164+4250, 28477+6657, 31914+6127, 36802+6303, 37464+9473],
  windows:    [4000+500, 3000+500, 4000+500, 4000+500, 4000+500],
  refresh:    [0, 13277, 20069, 11764, 10114],
  scrub:      [10160, 10000, 10000, 10000, 10000],
  nonrestroom:[300+40, 300+40, 300+40, 300+40, 300+40],
  oneoffs:    [0, 0, 0, 0, 0],
};

// ===== ACTUAL FRANCHISE FEE (total company) =====
const ACTUAL_FRANCHISE_TOTAL = [34233, 37804, 43961, 40972, 42100];

// ===== COMPANY-WIDE EXPENSES =====
const ACTUAL_SALES_EXPENSE = [28158, 35944, 19579, 22328, 26447];
const ACTUAL_OPERATING_EXPENSE = [22479, 25373, 30160, 28979, 26940];
const ACTUAL_OVERHEAD_EXPENSE = [7793, 9469, 5766, 6596, 5838];

const BUDGET_SALES_EXPENSE = [30166, 32246, 33286, 33806, 34846, 36502, 36502, 36502, 36502, 36502, 36502, 36502, 36502];
const BUDGET_OPERATING_EXPENSE = [22261, 23409, 23409, 23409, 33409, 38409, 23409, 23409, 23409, 23409, 23409, 23409, 23409];
const BUDGET_OVERHEAD_EXPENSE = [6675, 6675, 6675, 6675, 6675, 6675, 6675, 6675, 6675, 7675, 6675, 6675, 6675];

// Cost allocation rules per Warren
const COST_RULES = {
  sani:        { cogsRate: 0.03, franchiseFeeRate: 0.13, laborRate: 0.23, fuelRate: 0.10, fuelBasis: "labor" },
  windows:     { cogsRate: 0.02, franchiseFeeRate: 0.13, laborRate: 0.30, fuelRate: 0.03, fuelBasis: "revenue" },
  refresh:     { cogsRate: 0.05, franchiseFeeRate: 0.13, laborRate: 0.20, fuelRate: 0, fuelBasis: "revenue" },
  scrub:       { cogsRate: 0.01, franchiseFeeRate: 0.13, laborRate: 0.23, fuelRate: 0, fuelBasis: "revenue" },
  nonrestroom: { cogsRate: 0.05, franchiseFeeRate: 0.13, laborRate: 0.35, fuelRate: 0.10, fuelBasis: "revenue" },
  oneoffs:     { cogsRate: 0, franchiseFeeRate: 0, laborRate: 0.20, fuelRate: 0, fuelBasis: "revenue" },
};

const SERVICES = ["sani", "scrub", "windows", "refresh", "nonrestroom", "oneoffs"];
const PERIODS_COMPLETED = 5;

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

  const rules = COST_RULES[service];
  let vehicleExpense, routeLabor;
  if (rules.fuelBasis === "labor" && rules.fuelRate > 0) {
    vehicleExpense = Math.round(totalLabor * (rules.fuelRate / (1 + rules.fuelRate)));
    routeLabor = totalLabor - vehicleExpense;
  } else if (rules.fuelRate > 0) {
    vehicleExpense = Math.round(rev * rules.fuelRate);
    routeLabor = totalLabor - vehicleExpense;
  } else {
    vehicleExpense = 0;
    routeLabor = totalLabor;
  }

  return {
    client_id: CLIENT_ID,
    service_name: service,
    period_num: periodIdx + 1,
    data_type: "actual",
    revenue: rev,
    cogs,
    franchise_fee: franchiseFee,
    route_labor: Math.max(routeLabor, 0),
    vehicle_expense: Math.max(vehicleExpense, 0),
  };
}

async function run() {
  console.log(`Loading V12 data for client: ${CLIENT_ID}`);

  // Clear existing data for this client
  console.log("Clearing existing service_period_data...");
  await sb.from("service_period_data").delete().eq("client_id", CLIENT_ID);
  console.log("Clearing existing company_expenses...");
  await sb.from("company_expenses").delete().eq("client_id", CLIENT_ID);

  // Build service period rows
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

  // Build company expense rows
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

  // Verify
  const { count: spdCount } = await sb.from("service_period_data").select("*", { count: "exact", head: true }).eq("client_id", CLIENT_ID);
  const { count: ceCount } = await sb.from("company_expenses").select("*", { count: "exact", head: true }).eq("client_id", CLIENT_ID);
  console.log(`\nVerification: ${spdCount} service rows, ${ceCount} expense rows for client ${CLIENT_ID}`);
  console.log("Done!");
}

run().catch(err => { console.error(err); process.exit(1); });
