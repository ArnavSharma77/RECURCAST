# RecurCast — Data Source Reference

## Supabase Project
- **URL:** `https://sphewklcsrgpwwdjeorv.supabase.co`
- **Project Region:** ap-northeast-1 (Tokyo)
- **Note:** The free-tier Supabase project may pause after inactivity. If the dashboard shows a loading spinner indefinitely, the project needs to be resumed from the [Supabase Dashboard](https://supabase.com/dashboard).

## Database Tables

### `clients`
| Column | Description |
|--------|-------------|
| id | UUID primary key |
| name | Business display name |
| username | Login username |
| password_hash | Plain-text password (simple auth) |
| fiscal_year | e.g. 2026 |
| periods_completed | Number of periods with actual data entered |
| cx_rate | Cancellation rate (decimal, e.g. 0.10) |
| commission_rate | Sales commission % (decimal) |
| weekly_sales_rate | New sales $/week for forecasting |

### `period_data`
| Column | Description |
|--------|-------------|
| client_id | FK to clients |
| period_num | 1–13 |
| data_type | `budget`, `actual`, or `forecast` |
| total_income | Total revenue for the period |
| service_rev | Recurring service revenue |
| product_rev | Product sales revenue |
| install_rev | Installation revenue (one-off) |
| trip_rev | Trip charge revenue |
| total_cogs | Cost of goods sold |
| gross_profit | total_income - total_cogs |
| total_expense | All operating expenses |
| net_income | gross_profit - total_expense |
| adj_gross_profit | AGP (see formula below) |
| customer_count | End-of-period customer count |

**Unique constraint:** `(client_id, period_num, data_type)`

### `service_period_data` *(Premium — pending creation)*
Per-service breakdown for Windows, Refresh, Sani, Scrub.

## Current Clients

| Client | Username | Name | Periods | FY |
|--------|----------|------|---------|-----|
| Warren | `warren` | Enviro-Master of St. Louis | 5 | 2026 |
| Troy | `troy` | Enviro-Master of Utah | 4 | 2026 |

## Data Sources by Client

### Warren (Enviro-Master of St. Louis)

| Data | Source File | Last Seeded |
|------|-------------|-------------|
| Budget P1–P13 | `Dashboard V11 Corrected.xlsx` — "Cx sheet" tab | 2026-05-21 |
| Actuals P1–P4 | `Dashboard V11 Corrected.xlsx` — Actuals tab | 2026-05-21 |
| Actuals P5 | `Dashboard V11 Corrected.xlsx` (Warren entered P5 directly) | 2026-05-26 |

**Key verification values (from DB):**
- P1 Budget Total Income: $230,367
- P2 Budget Net Income: $2,790
- P2 Actual Net Income: -$51,291
- P5 Actual Total Income: $308,147
- P5 Actual Net Income: $46,051

### Troy (Enviro-Master of Utah)

| Data | Source File | Last Seeded |
|------|-------------|-------------|
| Budget P1–P4 | Set equal to actuals (no separate budget provided) | 2026-05-22 |
| Budget P5–P13 | Forecast figures based on $100/wk growth | 2026-05-22 |
| Actuals P1–P4 | Utah P1–P4 P&L PDFs | 2026-05-22 |

## Calculations & Formulas

### AGP (Adjusted Gross Profit)
```
AGP = Gross Profit - Franchise Fees (13% of Total Income) - Route Labor (24% of Total Income) - Auto Expense
```

### Rolling Forecast
```
For period i:
  if i < periods_completed → use actual
  else → use forecast (or budget if no forecast row)
```

### What-If Auto-Scaling
- COGS scales linearly with revenue (ratio derived from base forecast)
- ~40% of expenses are treated as variable (scale with revenue)
- Remaining 60% is fixed

## Troubleshooting

### Supabase Paused/Timeout
The free-tier project auto-pauses after 7 days of inactivity.
1. Go to https://supabase.com/dashboard
2. Select the `sphewklcsrgpwwdjeorv` project
3. Click "Restore project" if paused
4. Wait ~60 seconds for it to come back online

### Data Not Matching V11
If dashboard values don't match the Excel:
1. Confirm which version of V11 is being referenced (original vs "Corrected")
2. Check `updated_at` timestamps: `SELECT period_num, data_type, updated_at FROM period_data WHERE client_id = '...' ORDER BY updated_at DESC LIMIT 10;`
3. Re-seed from the latest Excel if needed using the scripts in `/scripts/`
