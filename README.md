# Nexis

**Private autonomous research and intelligence agent.**

Give it a goal — analyze a token, track wallets, run competitive intelligence, research a market — and it plans and executes complex multi-step workflows continuously, without you touching it again.

Every request is routed through [Gensyn AXL](https://gensyn.ai)'s encrypted P2P mesh. Research sessions persist on [0G](https://0g.ai) decentralized storage. Agents pay for data autonomously via [x402](https://x402.org) micropayments. No API, RPC, or data provider can profile your identity or intent.

---

## How it works

```
User goal → Planner → Orchestrator → [Gensyn AXL router] → Tools → Claude API → 0G memory
                                              ↑
                              All outbound requests intercepted here
                              No external endpoint sees direct connection
```

---

## Stack

| Layer | Technology |
|---|---|
| Agent brain | TypeScript orchestrator + capability registry |
| Privacy routing | Gensyn AXL — encrypted P2P mesh |
| Persistent memory | 0G decentralized storage |
| Anonymous payments | x402 protocol |
| Identity | ENS |
| Automation | KeeperHub scheduled triggers |
| LLM | Anthropic Claude API |

---

## Capabilities

- **Onchain research** — wallet analysis, token tracking, transaction patterns
- **Market intelligence** — pricing landscapes, feature matrices, hiring signals
- **Competitive intel** — week-over-week competitor tracking, decision generation
- **Reddit analysis** — pain points, sentiment, feature gaps from community data
- **Content generation** — research-grounded blog posts, threads, briefs

All capabilities route through the privacy layer. No intent leakage.

---

## Getting started

```bash
# 1. Clone
git clone https://github.com/0xZaid10/Nexis.git
cd Nexis

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in your keys

# 4. Download AXL binary (Gensyn)
# Place in axl-node/axl and chmod +x

# 5. Run
npm run dev
```

---

## Project structure

```
src/
├── agent/          # Orchestrator, planner, capabilities
├── privacy/        # AXL sidecar + request router
├── memory/         # SQLite cache + 0G decentralized storage
├── payments/       # x402 middleware + wallet
├── identity/       # ENS resolution
├── scheduler/      # KeeperHub webhook handler
├── services/       # LLM, scraper, Reddit, social
├── api/            # Express server + routes
├── utils/          # Circuit breaker, queue, logger
└── types/          # Global TypeScript types
```

---

## Built for

[ETHGlobal OpenAgents 2026](https://ethglobal.com/events/openagents) — Privacy track

**Sponsor integrations:** Gensyn · 0G · x402 · ENS · KeeperHub

---

*Built by [@0xZaid](https://twitter.com/0xZaid_)*
