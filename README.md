# RecurCast Web Application

Financial forecasting & growth modeling for recurring revenue businesses.  
Built by **ClearPath Analytics**.

## Quick Start

```bash
# Frontend (Next.js)
npm install
npm run dev        # → http://localhost:3000

# Backend (FastAPI)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Architecture

| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | Next.js + Tailwind + Recharts | Dashboard, What-If tool, Intake form |
| Backend | FastAPI (Python) | PDF reports, forecast engine, client CRUD |
| Database | Supabase | Auth, client data, row-level security |
| What-If Engine | TypeScript (client-side) | Instant scenario calculations |

## Pages

- `/` — Landing page
- `/dashboard` — KPIs, revenue vs budget charts, variance analysis
- `/whatif` — Interactive What-If tool with real-time sliders & payback
- `/intake` — Client onboarding (minimal input + P&L upload)
- `/pricing` — Tier comparison (Essentials / Growth / Premium)

## Key Features

- **Instant What-If**: Sliders update charts in real-time (no server round-trip)
- **\*12/\*16 Revenue Model**: Additive recurring revenue growth
- **AGP Payback**: Salesperson breakeven with 1-period collection delay
- **Auto-Derived Metrics**: Upload P&L → expense ratios calculated automatically
- **Tier Gating**: Essentials ($49), Growth ($89), Premium ($149)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Migration

SQL migration is in `supabase/migrations/001_create_recurcast_schema.sql`.  
Apply via Supabase dashboard SQL editor or CLI.
