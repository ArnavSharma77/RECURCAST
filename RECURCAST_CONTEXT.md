# RecurCast — Project Context & Knowledge Base

> Living reference document synthesized from the full build history, Warren Heuman's feedback, and the current web application.  
> **Brand:** RecurCast by Foresight Finance (formerly ClearPath Analytics)  
> **Primary stakeholder:** Warren Heuman, Owner — Enviro-Master of St. Louis  
> **Demo client:** Enviro-Master franchise locations (Warren = St. Louis, Troy = Utah)

---

## 1. What RecurCast Is

RecurCast is a **financial forecasting and strategy tool for recurring-revenue service businesses**. It started as an Excel budget workbook for Enviro-Master franchise owners and evolved into a web application.

**Core promise:** *Stop Hoping. Build a Strategy.*

Instead of a static spreadsheet, owners can:
- See where they stand vs budget (Dashboard)
- Model "what if" scenarios live (staffing, sales, pricing, churn)
- Enter actuals each period and keep the forecast current (13-period rolling)
- Drill into per-service profitability (Premium Analytics)

**Target market:** Franchise owners in recurring-revenue industries (commercial cleaning/sanitation first, but designed to work for lawn care, pest control, etc.).

---

## 2. The Business Problem It Solves

Warren's original Excel budget had **projections only** — no way to:
1. Enter real actuals as each 4-week period closes
2. See variance (actual vs budget) period by period and YTD
3. Blend actuals into the forecast so the view stays current (rolling forecast)
4. Run scenarios without breaking the base model

Most franchise locations have **no corporate budgeting tools**. ~90% use similar P&L categories (per bookkeeper), but cost percentages vary by location. RecurCast provides a locked template + parameters sheet so owners enter their own rates without breaking formulas.

---

## 3. Core Financial Concepts

### 3.1 The 13-Period Fiscal Year
- Each "period" = **4 weeks** (not calendar month)
- 13 periods per fiscal year (P1–P13)
- Control cell `U1` / `periods_completed` tracks how many periods have actual data

### 3.2 Rolling Forecast
```
For each period i:
  if i <= periods_completed → use ACTUAL data
  else                    → use FORECAST (or budget)
```
As actuals are entered, the forecast automatically updates. The "Actual | Forecast" boundary moves forward each period.

### 3.3 Additive Recurring Revenue Model (*12/*16)
Future-period revenue is built **forward** from the last actual:
- New sales added each period (weekly sales rate × 4 weeks)
- Cancellations applied at CX rate (e.g. 10%)
- Revenue only grows from recurring base (customers stay)
- **One-off sales** are separate — they do NOT carry forward; budget amount only

### 3.4 AGP (Adjusted Gross Profit)
```
AGP = Gross Profit
    - Franchise Fees (13% of Total Income)
    - Route/Tech Labor (24% of Total Income)
    - Vehicle Expense
```
AGP is the metric used for **salesperson payback** calculations.

### 3.5 Avg Weekly Rev/Cust
```
= Service Revenue only / (Customer Count × 4 weeks)
```
**Excludes one-off revenue** (installs, product, one-offs service line). Used as a health metric for recurring business.

### 3.6 What-If Engine
Client-side TypeScript engine (`src/lib/model.ts`):
- Sliders adjust staff cost, weekly sales ramp, CX rate, price increases
- COGS and ~40% of expenses scale with revenue changes
- AGP-based payback with 1-period collection delay
- Base forecast is never modified — scenario runs alongside

### 3.7 One-Off Revenue
- **NOT** installs + product combined
- Dedicated **"One-Offs"** line on the Cx sheet (line 21 per Warren)
- Budget: $4,000 per period for demo
- Separate service in Premium Analytics (`oneoffs` key)
- Excluded from avg weekly rev/cust

---

## 4. Service Lines

| Service | Key | Notes |
|---------|-----|-------|
| Windows (RPM) | `windows` | ~40% of revenue |
| Refresh | `refresh` | ~25% |
| Sani | `sani` | ~20% |
| Scrub | `scrub` | ~15% |
| One-Offs | `oneoffs` | Non-recurring; $4K/period budget |

Warren's Excel originally grouped as RPM, Sani, Scrub, Refresh, Other. Web app uses individual service lines + One-Offs.

---

## 5. Application Pages

| Route | Tier | Purpose |
|-------|------|---------|
| `/` | Public | Landing page — story, CTAs, Quick Start |
| `/login` | Public | Client login (username/password per client) |
| `/dashboard` | Base | KPIs, revenue vs budget, variance, net profit, one-off revenue, period table |
| `/whatif` | Base | Interactive scenario builder with sliders, payback chart |
| `/actuals` | Base | Enter period actuals to update rolling forecast |
| `/intake` | Base | Client onboarding form |
| `/pricing` | Public | Tier comparison |
| `/premium` | Premium | Service-level analytics, overall expenses charts |
| `/premium/[service]` | Premium | Deep dive per service (revenue, AGP, labor, COGS) |

### Base vs Premium Split (Warren's strategy)
Warren suggested moving **Overall Expenses** (Sales, Operating, Overhead charts) to Premium only — creates upsell leverage if clients push back.

---

## 6. Pricing Tiers (Planned)

| Tier | Price | Includes |
|------|-------|----------|
| Essentials | ~$49/mo | Dashboard, What-If, Actuals |
| Growth | ~$89/mo | + more features |
| Premium | ~$149/mo | + per-service analytics, overall expenses |

Excel era: Base ~$500, Premium ~$1,000 (one-time template).

Warren also discussed franchisor potentially **supplementing cost** for franchisees.

---

## 7. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, Tailwind CSS, Recharts, Framer Motion |
| What-If Engine | TypeScript (client-side, no server round-trip) |
| Database | Supabase (PostgreSQL) |
| Auth | Simple cookie-based (`rc_client`, `rc_user`) |
| Deployment | Vercel (https://recurcast-web.vercel.app) |
| Backend (optional) | FastAPI Python — PDF reports |
| Screenshots | Playwright (`scripts/screenshots.mjs`) |

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=       # Required — browser + server
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Required — client-side Supabase
SUPABASE_SERVICE_KEY=           # Required — server login API only
SITE_PASSWORD=                  # Optional — site gate (/api/auth)
```

---

## 8. Data Sources

- **Warren (St. Louis):** Budget from `Dashboard V11 Corrected.xlsx` Cx sheet; Actuals P1–P5
- **Troy (Utah):** Budget P1–P4 = actuals; P5–P13 forecast at $100/wk growth
- **Demo fallback:** `src/lib/demo-data.ts` and `src/lib/service-demo-data.ts` when Supabase unavailable
- **Supabase tables:** `clients`, `period_data`, `service_period_data` (Premium)

---

## 9. Warren Heuman — Role & Importance

Warren is the **domain expert, primary user, and product owner**. He is:
- Owner of Enviro-Master of St. Louis (franchise location)
- The "senior" who provided video walkthroughs of the original Excel budget
- Driving product direction for both Excel templates and the web app
- Connecting with VP of Operations and other franchisees (Troy) for validation
- Negotiating commercial terms ($50/hr, $2,500 retainer)

**His input shaped every major decision.** When in doubt, Warren's logic wins.

---

## 10. Warren's Feedback — Excel Era (Chronological)

### Phase 1: Actuals Tracking System
- **Problem:** Cx sheet had projections only, labeled misleadingly as "Actual"
- **Solution built:** Actuals Input, Variance Analysis, Rolling Forecast sheets
- **Key fix:** Net Ordinary Income = Gross Profit − Expenses (not Total Income − Expenses)
- **Key fix:** Variance sign was inverted on P1 (~$2,500 should be negative, not positive)

### Phase 2: Dashboard Charts (v1–v4)
- Warren wanted **graphs showing trends** — "the engineer in me likes graphs"
- Built 8 charts: Net Income Trend, Cumulative Variance, Revenue by Service, GP Margin, Expense Breakdown, Cancellation Trend, Rolling vs Budget, Top 5 Expenses
- Fixed: charts crashing to zero for incomplete periods (use blank, not zero)
- Fixed: axis labels overlapping, wrong units, upside-down bars
- Google Drive download issue: charts don't render when downloaded from Drive (Excel limitation)

### Phase 3: Dashboard v5 Changes
- Revenue by service: simplify to **RPM, Sani, Scrub, Refresh, Other** — YTD bar chart (budget vs actual), not per-period stacked
- Expense breakdown: add **second pie chart** for budgeted breakdown side by side
- Remove cancellation trend chart
- Add **Operations Labor** and **Sales Cost** charts
- Add **Actual Avg Weekly Sales** input row on Actuals Input sheet

### Phase 4: Mgmt Bonus Exclusion
- Warren inserted Mgmt Bonus + Mgmt rows on Actuals Input (after PAYROLL)
- Only **Mgmt Bonus** excluded from Net Income for graphs
- Added visible **"Net Income w/o Mgmt Bonus"** row
- Separate CX/AI row constants (Actuals Input rows shifted +2 vs Cx sheet)

### Phase 5: Actuals Input Cleanup
- Remove cancellation lines from Actuals Input (lines 6–7, 22–30) — already factored into actuals
- Collapse individual Franchise Fee lines to **total only**
- Variance Analysis and Rolling Forecast should use **Net Income w/o Mgmt Bonus**

### Phase 6: Additive RF Model (v10)
- Rolling Forecast must **build forward** from last actual, not copy budget
- New sales added each period; revenue grows (recurring customers stay)
- **One-off sales line** — separate, does not carry forward
- Costs recalculate based on new revenue levels

### Phase 7: Franchise Template Product
- Flat offering to other franchises — **format only, no data populated**
- **Base tier:** aggregated service/product totals
- **Premium tier:** per-service line breakdown + dashboard
- **Parameters sheet:** editable rates (COGS %, route pay %, franchise fees, etc.)
- Sheet protection / VBA / IRM to prevent breaking formulas
- What-If tab (Option A): side-by-side scenario without touching base

### Phase 8: Trip Charge & Installation Growth
- Trip Charge and Installation Revenue grow as function of new Sani sales
- Parameters-driven: flat dollar growth per period (Warren's preference)

### Phase 9: Branding
- Generic company name for cross-industry marketing
- **RecurCast** = product name (recurring + forecast)
- Tagline: **Stop Hoping. Build a Strategy.**

### Phase 10: VP Demo Prep
- Graph needs to shift left (can't see far-right info)
- Troy (Utah) validated Base tier — excited for Premium
- Discuss Premium = per-service profitability reporting

---

## 11. Warren's Feedback — Web App Era (Chronological)

### UI/UX Overhaul
- Premium, minimalistic, easy to navigate
- Royal dark blue premium theme with gold accents
- Logo integration (prominent, not blurry — use `unoptimized` on Next.js Image)
- Sliding nav header (21st.dev pattern)
- Shiny button for What-If CTA
- Landing page: tell a story, not scattered cards; showcase Premium; keep tagline

### Premium Analytics Feature
- Per-service deep dive: Sani, Scrub, Windows (RPM), Refresh, Non-Restroom/Janitorial, One-Offs
- Revenue vs Budget, AGP, Labor, COGS by period
- Revenue comparison chart needs **"% of Budget" label**

### V12 Data Integration (Jun 2026)
- Warren provided Budget 2026 - Dashboard v12.xlsx with highlighted changes
- Per-service cost allocation rules defined:
  - **Sani:** COGS (3%), 13% franchise fee, labor (23%), sani fuel (10% of labor)
  - **Windows/RPM:** COGS (2%), 13% franchise fee, labor (30%), window fuel (3%)
  - **Refresh:** COGS (5%), 13% franchise fee, labor (20%)
  - **Scrub:** COGS (1%), 13% franchise fee, labor (23%)
  - **Non-Restroom/Janitorial:** COGS (5%), 13% franchise fee, labor (35%), fuel (10%)
  - **One-Off:** labor (20%) only — no COGS, no franchise fee
- **Sales, Operating, Overhead remain company-wide only** (not allocated per service)
- Revenue % per service is NOT fixed — varies by period based on sales forecast
- "Non-Restroom/Janitorial" added as 6th service line
- Creating new P&L categories per service for premium profitability breakdown

### Data & Structure (Critical)
| Warren Said | Action Taken |
|-------------|--------------|
| "One offs is line 21 in the Cx sheet. Not installs and product." | Added `oneoffs` service; $4K/period budget |
| "Sales, operating and overhead expenses should be for overall not in each service" | Moved to company-wide; later moved to Premium only |
| "I was thinking graphs like the revenue budget vs actual" | Added 3 bar charts (Sales, Operating, Overhead) |
| "Can the per period sales forecast be numerical entry rather than arrows" | Text inputs, no spinner arrows |
| "Is the base staff cost number for a month or period?" | Clarified: per 4-week period |
| "The gray on the graph pop up windows is really hard to read" | Fixed tooltip text to dark color |
| "Should Overall Expenses be in Premium?" | Moved to Premium only (demo strategy for upsell) |
| "What-If parameters should start at zero except cancellation" | All sliders default to 0; CX uses base rate |
| "One off revenue still says installs plus products" | Fixed label; numbers from oneoffs service line |
| "Did we add vehicle expense into AGP?" | Confirmed yes; updated footnote |
| "Did you remove one off from avg weekly rev/cust?" | Confirmed yes (service rev only) |
| "Quick Start on homepage should take you to the page" | Made Dashboard, What-If, Actuals clickable links |

---

## 12. Key Design Decisions to Preserve

1. **Tagline is sacred:** "Stop Hoping. Build a Strategy." — do not change
2. **13-period rolling** is core — never switch to calendar months in UI labels without Warren's OK
3. **One-offs ≠ installs + product** — always use dedicated One-Offs line
4. **Expenses are company-wide**, not per-service (Premium placement is a business decision)
5. **What-If defaults to zero** — scenario shows no impact until user adjusts
6. **AGP per service** = Revenue - COGS - Franchise Fee (13%) - Route/Tech Labor - Vehicle/Fuel
7. **Cost rates per service differ** — Sani 41.3%, Windows 48%, Refresh 38%, Scrub 37%, Non-Restroom 63%, One-Off 20%
7. **Avg Weekly Rev/Cust excludes one-offs** — recurring service revenue only
8. **Staff cost is per 4-week period**, not calendar month
9. **Premium vs Base split** is intentional for pricing strategy
10. **Warren's Excel is source of truth** for formulas and business logic

---

## 13. Major Milestones (Timeline)

| Phase | Deliverable |
|-------|-------------|
| Excel Actuals System | Actuals Input, Variance, Rolling Forecast sheets |
| Excel Dashboard v1–v4 | 8 auto-updating charts |
| Excel Dashboard v5 | Simplified service lines, dual pie charts, new labor charts |
| Excel v8–v10 | Mgmt bonus exclusion, additive RF, one-off sales row |
| Franchise Templates | Base ($500) + Premium ($1,000) locked workbooks |
| What-If Tab (Excel) | Side-by-side scenario sheet |
| Web App v1 | Next.js dashboard, what-if, actuals, Supabase |
| Premium Analytics | Per-service pages and overview |
| UI Overhaul | Royal premium theme, logo, landing page, nav |
| GitHub + Vercel | Repo: ArnavSharma77/RECURCAST, deployed to recurcast-web.vercel.app |
| V12 Data Integration | Real per-service P&L with Warren's cost allocation rules, 6 services |

---

## 14. Open Items & Future Considerations

- [ ] Connect GitHub repo to Vercel for auto-deploy + preview env vars
- [ ] Rotate Supabase service key (was exposed in local commit attempt)
- [ ] Populate `service_period_data` table in Supabase (currently demo data)
- [ ] Premium tier gating (feature-gate component exists, not fully enforced)
- [ ] VP of Operations demo feedback
- [ ] Troy (Utah) Premium demo
- [ ] Franchisor cost subsidy discussion
- [ ] Intake form → auto-populate client parameters
- [ ] PDF report generation via FastAPI backend
- [ ] Custom domain for production
- [ ] Net Income w/o Mgmt Bonus in web app (Excel has it; web may need it)

---

## 15. Testing & Review Workflow

Standard iteration loop (per user request):
1. Plug in data (demo or Supabase)
2. Build and run locally / deploy to Vercel
3. Take screenshots (`node scripts/screenshots.mjs`)
4. Review all pages: landing, login, dashboard, what-if, actuals, premium
5. Iterate until no further improvements

**Note:** Playwright screenshots show loading spinners on data-heavy pages without real Supabase auth. Verify authenticated flows in browser manually.

---

## 16. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/model.ts` | Financial engine — What-If, payback, formatting |
| `src/lib/demo-data.ts` | Warren's P1–P13 budget and actuals |
| `src/lib/service-demo-data.ts` | Per-service demo data including oneoffs |
| `src/lib/services.ts` | Service definitions and colors |
| `src/app/dashboard/page.tsx` | Main dashboard |
| `src/app/premium/page.tsx` | Premium overview + overall expenses |
| `src/app/whatif/page.tsx` | What-If scenario builder |
| `src/app/page.tsx` | Landing page |
| `DATA_SOURCES.md` | Supabase schema and data provenance |
| `warren-mail.txt` | Latest update email draft for Warren |
| `scripts/screenshots.mjs` | Automated screenshot capture |

---

## 17. People

| Person | Role |
|--------|------|
| **Warren Heuman** | Product owner, Enviro-Master St. Louis, domain expert |
| **Troy** | Early validator, Enviro-Master Utah, Base tier user |
| **Arnav Sharma** | Developer / builder |
| **VP of Operations** | Potential franchise-system advocate (Warren demoing to him) |
| **Bookkeeper contact** | Confirmed ~90% P&L category consistency across locations |

---

## 18. Warren Mail Template

Keep `warren-mail.txt` updated after each deployment cycle. Short, formatted, answers his questions directly. Warren prefers concise updates with clear before/after.

---

*Last updated: June 2026 — reflects state through Quick Start links fix, Premium expenses move, What-If zero defaults, and one-off revenue correction.*
