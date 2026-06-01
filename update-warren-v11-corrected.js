const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WARREN_USERNAME = 'warren';
const FRANCHISE_FEE_RATE = 0.13;
const ROUTE_LABOR_RATE = 0.24;

function calcAGP(gp, totalIncome) {
  const ff = Math.round(totalIncome * FRANCHISE_FEE_RATE);
  const rl = Math.round(totalIncome * ROUTE_LABOR_RATE);
  return gp - ff - rl;
}

// === ACTUALS (P1-P4) from "Actuals Input" sheet ===
const ACTUALS = [
  { period: 1, product_rev: 18351, service_rev: 215530, install_rev: 2964, trip_rev: 14692, total_income: 251537, total_cogs: 41070, gross_profit: 210467, total_expense: 216649, net_income: -5106 },
  { period: 2, product_rev: 19837, service_rev: 232009, install_rev: 3825, trip_rev: 15181, total_income: 270852, total_cogs: 23250, gross_profit: 247602, total_expense: 268566, net_income: -51291 },
  { period: 3, product_rev: 22474, service_rev: 270411, install_rev: 4242, trip_rev: 15137, total_income: 312264, total_cogs: 19200, gross_profit: 293064, total_expense: 242994, net_income: 50973 },
  { period: 4, product_rev: 22185, service_rev: 266282, install_rev: 2690, trip_rev: 15677, total_income: 306834, total_cogs: 34712, gross_profit: 272122, total_expense: 237373, net_income: 35837 },
];

// === BUDGET (P1-P13) from "Cx sheet" - these are the projections ===
const BUDGET = [
  { period: 1, product_rev: 16249, service_rev: 194804, install_rev: 7253, trip_rev: 10661, total_income: 230367, total_cogs: 18034, gross_profit: 212332, total_expense: 232982, net_income: -18404 },
  { period: 2, product_rev: 16569, service_rev: 201376, install_rev: 990, trip_rev: 10798, total_income: 231133, total_cogs: 12651, gross_profit: 218482, total_expense: 215692, net_income: 2790 },
  { period: 3, product_rev: 17710, service_rev: 208590, install_rev: 1089, trip_rev: 10949, total_income: 239738, total_cogs: 13373, gross_profit: 226365, total_expense: 220007, net_income: 6358 },
  { period: 4, product_rev: 18030, service_rev: 216125, install_rev: 1139, trip_rev: 11107, total_income: 247800, total_cogs: 13687, gross_profit: 234113, total_expense: 223787, net_income: 10326 },
  { period: 5, product_rev: 18350, service_rev: 224300, install_rev: 1238, trip_rev: 11278, total_income: 256566, total_cogs: 14056, gross_profit: 242510, total_expense: 246229, net_income: -3720 },
  { period: 6, product_rev: 18670, service_rev: 233117, install_rev: 1337, trip_rev: 11463, total_income: 265987, total_cogs: 14436, gross_profit: 251551, total_expense: 256112, net_income: -4562 },
  { period: 7, product_rev: 18990, service_rev: 242044, install_rev: 1337, trip_rev: 11648, total_income: 275419, total_cogs: 14728, gross_profit: 260691, total_expense: 244916, net_income: 15776 },
  { period: 8, product_rev: 19310, service_rev: 250861, install_rev: 1337, trip_rev: 11833, total_income: 284741, total_cogs: 15019, gross_profit: 269722, total_expense: 248673, net_income: 21049 },
  { period: 9, product_rev: 19630, service_rev: 259678, install_rev: 1337, trip_rev: 12019, total_income: 294063, total_cogs: 15311, gross_profit: 278752, total_expense: 252431, net_income: 26322 },
  { period: 10, product_rev: 19950, service_rev: 268495, install_rev: 1337, trip_rev: 12204, total_income: 303385, total_cogs: 15603, gross_profit: 287782, total_expense: 257188, net_income: 30594 },
  { period: 11, product_rev: 20270, service_rev: 277312, install_rev: 1337, trip_rev: 12389, total_income: 312707, total_cogs: 15895, gross_profit: 296812, total_expense: 259946, net_income: 36867 },
  { period: 12, product_rev: 20590, service_rev: 286129, install_rev: 1337, trip_rev: 12574, total_income: 322030, total_cogs: 16188, gross_profit: 305842, total_expense: 263703, net_income: 42139 },
  { period: 13, product_rev: 20910, service_rev: 294946, install_rev: 1337, trip_rev: 12759, total_income: 331352, total_cogs: 16481, gross_profit: 314871, total_expense: 267461, net_income: 47410 },
];

// === FORECAST (P1-P4 = Actuals, P5-P13 from "Rolling Forecast") ===
const FORECAST_P5_13 = [
  { period: 5, product_rev: 22585, service_rev: 256332, install_rev: 1238, trip_rev: 14097, total_income: 295652, total_cogs: 16106, gross_profit: 279546, total_expense: 260756, net_income: 18790 },
  { period: 6, product_rev: 22985, service_rev: 267182, install_rev: 1337, trip_rev: 14329, total_income: 307232, total_cogs: 16562, gross_profit: 290670, total_expense: 271510, net_income: 19160 },
  { period: 7, product_rev: 23385, service_rev: 278032, install_rev: 1337, trip_rev: 14560, total_income: 318714, total_cogs: 16929, gross_profit: 301785, total_expense: 261139, net_income: 40646 },
  { period: 8, product_rev: 23785, service_rev: 288882, install_rev: 1337, trip_rev: 14792, total_income: 330195, total_cogs: 17296, gross_profit: 312899, total_expense: 265768, net_income: 47131 },
  { period: 9, product_rev: 24185, service_rev: 299732, install_rev: 1337, trip_rev: 15023, total_income: 341677, total_cogs: 17663, gross_profit: 324013, total_expense: 270397, net_income: 53616 },
  { period: 10, product_rev: 24585, service_rev: 310582, install_rev: 1337, trip_rev: 15255, total_income: 353158, total_cogs: 18031, gross_profit: 335127, total_expense: 276026, net_income: 59101 },
  { period: 11, product_rev: 24985, service_rev: 321432, install_rev: 1337, trip_rev: 15486, total_income: 364640, total_cogs: 18399, gross_profit: 346240, total_expense: 279654, net_income: 66586 },
  { period: 12, product_rev: 25385, service_rev: 332282, install_rev: 1337, trip_rev: 15717, total_income: 376121, total_cogs: 18767, gross_profit: 357354, total_expense: 284283, net_income: 73070 },
  { period: 13, product_rev: 25785, service_rev: 343132, install_rev: 1337, trip_rev: 15949, total_income: 387602, total_cogs: 19136, gross_profit: 368466, total_expense: 288912, net_income: 79554 },
];

async function main() {
  console.log('Connecting to Supabase...');

  // Get Warren's client ID
  const { data: clients, error: clientErr } = await supabase.from('clients').select('id, name').eq('username', WARREN_USERNAME);
  if (clientErr) { console.error('Error fetching client:', clientErr); process.exit(1); }
  if (!clients || clients.length === 0) { console.error('Warren not found!'); process.exit(1); }
  const clientId = clients[0].id;
  console.log(`Warren client: ${clients[0].name} (${clientId})`);

  // We'll use upsert to handle existing rows

  // Prepare all rows for batch insert
  const allRows = [];

  // ACTUALS (P1-P4)
  console.log('\n--- Preparing ACTUALS (P1-P4) ---');
  for (const a of ACTUALS) {
    const agp = calcAGP(a.gross_profit, a.total_income);
    allRows.push({
      client_id: clientId, period_num: a.period, data_type: 'actual',
      product_rev: a.product_rev, service_rev: a.service_rev, install_rev: a.install_rev, trip_rev: a.trip_rev,
      total_income: a.total_income, total_cogs: a.total_cogs, gross_profit: a.gross_profit,
      total_expense: a.total_expense, net_income: a.net_income, adj_gross_profit: agp
    });
    console.log(`  P${a.period} Actual: Income=${a.total_income}, GP=${a.gross_profit}, NI=${a.net_income}, AGP=${agp}`);
  }

  // BUDGET (P1-P13)
  console.log('\n--- Preparing BUDGET (P1-P13) ---');
  for (const b of BUDGET) {
    const agp = calcAGP(b.gross_profit, b.total_income);
    allRows.push({
      client_id: clientId, period_num: b.period, data_type: 'budget',
      product_rev: b.product_rev, service_rev: b.service_rev, install_rev: b.install_rev, trip_rev: b.trip_rev,
      total_income: b.total_income, total_cogs: b.total_cogs, gross_profit: b.gross_profit,
      total_expense: b.total_expense, net_income: b.net_income, adj_gross_profit: agp
    });
    console.log(`  P${b.period} Budget: Income=${b.total_income}, NI=${b.net_income}, AGP=${agp}`);
  }

  // FORECAST (P1-P4 = Actuals, P5-P13 from Rolling Forecast)
  console.log('\n--- Preparing FORECAST (P1-P4 from actuals, P5-P13 from rolling) ---');
  for (const a of ACTUALS) {
    const agp = calcAGP(a.gross_profit, a.total_income);
    allRows.push({
      client_id: clientId, period_num: a.period, data_type: 'forecast',
      product_rev: a.product_rev, service_rev: a.service_rev, install_rev: a.install_rev, trip_rev: a.trip_rev,
      total_income: a.total_income, total_cogs: a.total_cogs, gross_profit: a.gross_profit,
      total_expense: a.total_expense, net_income: a.net_income, adj_gross_profit: agp
    });
    console.log(`  P${a.period} Forecast (=Actual): NI=${a.net_income}`);
  }
  for (const f of FORECAST_P5_13) {
    const agp = calcAGP(f.gross_profit, f.total_income);
    allRows.push({
      client_id: clientId, period_num: f.period, data_type: 'forecast',
      product_rev: f.product_rev, service_rev: f.service_rev, install_rev: f.install_rev, trip_rev: f.trip_rev,
      total_income: f.total_income, total_cogs: f.total_cogs, gross_profit: f.gross_profit,
      total_expense: f.total_expense, net_income: f.net_income, adj_gross_profit: agp
    });
    console.log(`  P${f.period} Forecast: Income=${f.total_income}, NI=${f.net_income}, AGP=${agp}`);
  }

  // Upsert all rows (handles both new and existing)
  console.log(`\n--- Upserting ${allRows.length} rows ---`);
  const { error: insertErr } = await supabase.from('period_data').upsert(allRows, { onConflict: 'client_id,period_num,data_type' });
  if (insertErr) { console.error('Upsert error:', insertErr); process.exit(1); }
  console.log('All rows upserted successfully!');

  // Verify
  const { data: verifyData } = await supabase.from('period_data').select('data_type, period_num, net_income').eq('client_id', clientId).order('period_num');
  
  console.log('\n--- VARIANCE CHECK (Actual NI - Budget NI) ---');
  const actuals = verifyData.filter(r => r.data_type === 'actual');
  const budgets = verifyData.filter(r => r.data_type === 'budget');
  for (const act of actuals) {
    const bud = budgets.find(b => b.period_num === act.period_num);
    const variance = act.net_income - bud.net_income;
    console.log(`  P${act.period_num}: Actual=${act.net_income}, Budget=${bud.net_income}, Variance=${variance}`);
  }
  
  console.log('\n  V11 Dashboard Data reference:');
  console.log('  Projected NI: [-18404, 2790, 6358, 10326, -3720, -4562, 15776, 21049, 26322, 30594, 36867, 42139, 47410]');
  console.log('  Actual NI:    [-5106, -51291, 50973, 35837]');
  console.log('  Period Var:   [13298, -54081, 44615, 25511]');

  console.log('\nDone! Warren data updated from V11 CORRECTED.');
}

main().catch(e => { console.error(e); process.exit(1); });
