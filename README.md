# Trade Info

Market-intelligence dashboard built around one idea: **News → Affected assets → Possible impact**.
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Recharts. No trades, no brokerage, no price predictions.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (analysis engine, parsers)
npm run build
```

## Deploy (Vercel, free)
1. Push this folder to a GitHub repo. 2. Vercel → *Add New Project* → import it → Deploy (no settings needed).
Optional env vars (server-side only, never sent to the browser): `FRED_API_KEY`, `NEWSAPI_KEY` — see `.env.example`.

## Data sources (all keyless by default)
| Data | Provider | Notes |
|---|---|---|
| Crypto prices, market cap, volume, history | CoinGecko public API | rate-limited; free history ≈ 1 year |
| Forex | ExchangeRate-API (open) + ECB via Frankfurter | daily/delayed — labelled |
| Gold, oil, indices | Yahoo Finance chart API (fallback: Stooq CSV) | end-of-day, delayed — labelled |
| News | BBC, CNBC, Al Jazeera, Guardian, CoinDesk, Cointelegraph, Fed, ECB RSS + GDELT (+ NewsAPI if key set) | cached 2–10 min |
| Calendar | Curated official central-bank schedules + Forex Factory weekly JSON | no events are invented |

All providers live in `lib/providers/*` behind server `/api/*` routes with in-memory TTL cache, stale-on-error, and throttling. Add a provider by returning the same shapes (`Quote`, `RawItem`, `CalEvent`).
If every provider fails, the UI shows a clearly marked **DEMO** banner; demo values are placeholders, never presented as real.

## How analysis works (no AI key needed)
`lib/analysis/` — transparent rules, not a black box:
- classify category/country, score importance, detect duplicates (title-token similarity) and group reports of the same event;
- status: *confirmed* (official source or ≥2 distinct sources), *developing*, *unverified* (single source with hedging words);
- `rules.ts` maps events to assets with mechanism, direct/indirect, direction (positive/negative/**mixed/uncertain**), alternative outcomes, factors, what to monitor. Most rules deliberately return *mixed/uncertain*.
- `AnalysisProvider` interface in `engine.ts` lets you plug in an LLM later without touching the UI.

## Safety principles implemented
No trade execution; portfolio is virtual and labelled SIMULATED. Impacts are scenarios, not forecasts. Historical reactions are computed from real daily closes and carry a correlation≠causation disclaimer. Delayed data is labelled; sources are always shown.

## Accounts (Supabase)

Without Supabase the app runs in **local mode** (data in this browser's localStorage, no login). With Supabase configured, every page requires sign-in and each user's data lives in PostgreSQL, protected by Row Level Security.

Setup:
1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql` (tables, RLS policies, new-user trigger).
3. Authentication → URL Configuration: set **Site URL** to your Vercel URL and add `https://YOUR-DOMAIN/auth/callback` (and `http://localhost:3000/auth/callback` for dev) to **Redirect URLs**.
4. Authentication → Providers → Email: keep "Confirm email" on for email verification (customise the templates if you like).
5. Optional Google: Providers → Google (client id/secret from Google Cloud), then set `NEXT_PUBLIC_GOOGLE_AUTH=true`.
6. Vercel → Settings → Environment Variables (then **redeploy**, `NEXT_PUBLIC_*` are baked in at build time):
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` — server only, never prefix with `NEXT_PUBLIC`; needed only for "Delete account".

Per-user data: profile (name/avatar), crypto/forex watchlist, favorites, saved news, saved AI analyses, virtual portfolio (+ trades and history), alerts (+ log), theme and dashboard preferences. Tables: `profiles, user_preferences, watchlists, saved_news, saved_analyses, virtual_portfolios, portfolio_assets, portfolio_trades, portfolio_history, user_alerts, alert_log`.

Security: passwords are handled and hashed by Supabase Auth; the browser only holds the public anon key; routes are protected by middleware and RLS (`user_id = auth.uid()`); redirects are validated; account deletion runs server-side after re-authentication and a typed `DELETE` confirmation.

## AI Analyst & autonomous news monitor

Needs accounts (above). Pieces: **AI Analyst** (`/analyst`), **Monitored Events** (`/monitor`), **Notifications** (bell), **Daily Briefing** (`/briefing`), preferences in Settings → News monitoring.

Setup:
1. Supabase → SQL Editor → run `supabase/ai_schema.sql` (after `schema.sql`; do not re-run `schema.sql` afterwards).
2. Vercel env vars (then redeploy):
   - `CRON_SECRET` — any random string ≥ 16 chars (protects the cron endpoints).
   - `ANTHROPIC_API_KEY` — from console.anthropic.com (server only). Without it the analyst and monitor still work in **rule-based mode** and say so.
   - Optional: `FRED_API_KEY` (US macro data), `ANTHROPIC_CHAT_MODEL`, `ANTHROPIC_FAST_MODEL`, `AI_DAILY_LIMIT` (questions/user/day, default 30), `AI_MAX_ANALYSES_PER_RUN` (default 4), `AI_MAX_ANALYSES_PER_DAY` (default 60).
3. Scheduler. Vercel Hobby cron runs at most once a day (`vercel.json` already has a daily fallback). For every-20-minute monitoring use the included GitHub Action `.github/workflows/monitor.yml`: repo → Settings → Secrets and variables → Actions → add `SITE_URL` (e.g. `https://your-app.vercel.app`) and `CRON_SECRET` (same value as in Vercel). Run it once via Actions → News monitor → Run workflow.

How it works: cron → `/api/cron/ingest` collects RSS/GDELT news → normalises, de-duplicates and groups articles into events → matches them to events already stored (no duplicates/alerts) → scores importance (critical/high/medium/low from source reliability, significance, affected assets, geography, confirmation, freshness — *not* predicted volatility) → maps related assets → Claude analyses only high/critical events (capped per run/day) → stores everything in Supabase → creates one in-app notification per matching user per event. `/api/cron/briefing` writes each user's daily briefing.

Reliability: retrieved articles are treated as untrusted data (prompt-injection safe); sources, links and timestamps are always shown; unconfirmed reports are labelled; impacts are "potential", never predictions; no trades are executed. Costs: with Haiku-class analysis of ≤4 events per run and Sonnet for chat, expect low single-digit USD/month for light use; the limits above cap it.

## Known limitations
- Developed in a sandbox with no outbound access to the data providers: parsers and pipeline are unit-tested and the UI was exercised with mocked responses, but **live-provider behaviour should be verified after the first deploy** (some providers change endpoints or block cloud IPs).
- Rule-based analysis is keyword-driven and can miss context; it never reads full articles.
- FOMC decision list and 2026 central-bank dates are curated from memory of official calendars — verify against the linked sources. BTC reaction history before ~1 year ago is unavailable on the free tier.
- Alerts only run while the app is open (no background push).
