# Nexis — Platform

## Project Overview
Nexis is a private AI research and blockchain intelligence platform. This repo contains:
1. **Home site** — fully complete at `/`
2. **Dashboard** — fully complete at `/dashboard/` with Clerk auth + 5 pages

## Architecture

### Artifacts
- **nexis-home** (`artifacts/nexis-home/`) — React + Vite home site, serves at `/`
- **nexis-dashboard** (`artifacts/nexis-dashboard/`) — React + Vite dashboard, serves at `/dashboard/`
- **api-server** (`artifacts/api-server/`) — Express proxy to `http://34.163.214.137:3000`, serves at `/api`, port 8080
- **mockup-sandbox** (`artifacts/mockup-sandbox/`) — Canvas component preview server

### API Routing
All browser calls go to `/api/nexis/*` → Express proxy → `http://34.163.214.137:3000/*`
- Sync endpoint timeout: 660s
- Regular calls timeout: 60s

### Real API Response Shape (`POST /api/research/sync` or `GET /api/research/session/:id`)
```json
{
  "success": true,
  "sessionId": "uuid",
  "userId": "string",
  "goal": "string",
  "run_at": "ISO timestamp",
  "plan": {
    "task_summary": "string",
    "output_type": "research",
    "capabilities_run": ["onchain", "reddit", "market"]
  },
  "summary": "# markdown intelligence report",
  "results": [
    {
      "capability": "onchain" | "reddit" | "market",
      "success": true,
      "data": { ... capability-specific shape ... },
      "duration_ms": 24784
    }
  ],
  "storage": { "rootHash": "0x...", "txHash": "0x...", "encrypted": true },
  "routedViaAXL": true,
  "duration_ms": 65900
}
```

### Capability Data Shapes
- **`onchain`** (`data.type = "wallet_intelligence"`): `address`, `chains_analyzed[]`, `profile` (wallet_type, total_usd, balances[], recent_txs[]), `analysis` (markdown), `privacy`
- **`reddit`** (`data.type = "community_research"`): `stats`, `report` (confirmed_pain_points[], weak_signals[], layer_analysis)
- **`market`** (`data.type = "market_research"`): `executive_summary` (top3_insights[], one_thing, confidence), `feature_matrix`, `market_signals.hacker_news[]`

### Research Flow (browser)
1. `POST /api/research` with `{ goal, userId }` → returns `{ sessionId }` immediately (background)
2. Poll `GET /api/research/session/:sessionId` every 5s until `summary` or `results` appear
3. Navigate to `/sessions/:sessionId` — SessionDetail renders full intelligence report

## Marketing Site Pages
- `/` — Home
- `/privacy` — Privacy Architecture
- `/use-cases` — Use Cases
- `/marketplace` — Marketplace
- `/docs` — API Reference
- `/about` — About

## Dashboard Pages
- `/` → New Research — background research + terminal + pipeline animation
- `/sessions` — list of sessions (uses `sessionId`, `goal`, `run_at`, `plan.capabilities_run`)
- `/sessions/:id` — full intelligence report (markdown summary + per-capability panels)
- `/onchain` — wallet lookup, launches background research → redirects to session detail
- `/keeperhub` — keeper node monitoring
- `/settings` — Clerk profile management

## Session Detail Panels (by capability)
- **Header card**: goal, sessionId, run_at, duration, AXL badge, capabilities chips
- **Intelligence Report**: full markdown `summary` (react-markdown + @tailwindcss/typography)
- **Onchain panel**: wallet profile stats, chain balances, recent txs table, detailed analysis, privacy proof
- **Reddit/Community panel**: stats grid, confirmed pain points (expandable), weak signals, layer analysis, data quality warnings
- **Market panel**: exec summary, top3 insights, feature matrix (collapsible), HN signals
- **Storage/Proof**: rootHash, txHash (Etherscan link), encrypted badge, AXL badge
- **Raw JSON**: collapsible

## Design System
- **Dark default** (`--background: 0 0% 4%` → `#0a0a0a`)
- **Accent**: `--nexis-green: #10b981` (dark), `#059669` (light)
- **Fonts**: Clash Display (display), Geist (body), Geist Mono (code)
- **Tailwind v4** with `@layer theme, base, clerk, components, utilities` + `@theme inline {}`
- **Clerk Tailwind config**: `tailwindcss({ optimize: false })` in vite.config.ts

## Key Dependencies (nexis-dashboard)
- `@clerk/react` v6 — auth (`useAuth`, `useUser`, `SignIn`, `SignUp`)
- `wouter` — routing with `base={basePath}`
- `react-markdown` + `@tailwindcss/typography` — markdown rendering in SessionDetail
- `lucide-react` — icons
- Tailwind v4

## Brand
- **Tag**: "Private Data Layer for the Agentic Internet"
- **Builder**: @0x_Zaid10, ETHGlobal OpenAgents 2026
- **Proof wallet**: `0x49CAdA74991C0090AF0be3FD387B17f1Da9d903D`
