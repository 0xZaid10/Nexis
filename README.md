<div align="center">

# Nexis

### The Private Data Access Layer for the Agentic Internet

*Any agent or human can query the world — without revealing their identity, intent, or strategy.*

[![ETHGlobal OpenAgents 2026](https://img.shields.io/badge/ETHGlobal-OpenAgents%202026-blue?style=flat-square)](https://ethglobal.com)
[![Gensyn AXL](https://img.shields.io/badge/Privacy-Gensyn%20AXL-purple?style=flat-square)](https://gensyn.ai)
[![0G Storage](https://img.shields.io/badge/Memory-0G%20Storage-green?style=flat-square)](https://0g.ai)
[![KeeperHub](https://img.shields.io/badge/Automation-KeeperHub-orange?style=flat-square)](https://keeperhub.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)](https://typescriptlang.org)

</div>

---

## The Problem

Every time an AI agent, researcher, or trader queries the internet for information, they leave a trail:

- **RPC providers** log every wallet address queried and when
- **Search engines** build profiles from query patterns
- **APIs** track who is researching what and how often
- **Data providers** like Nansen and Dune see your entire research strategy
- **Results** are stored on centralized servers that can be subpoenaed, breached, or sold

A trading agent querying price feeds reveals its strategy. A research agent querying competitors reveals its company's roadmap. A medical agent querying symptoms reveals patient data. A journalist investigating a wallet reveals their source.

**This is the surveillance layer underneath the modern internet — and nobody is solving it for agents.**

---

## What Nexis Is

Nexis is a **private autonomous research agent** and the foundation of a **private data access layer for the agentic internet**.

It lets any agent or human:
- Research markets, companies, communities, and on-chain activity
- Query any blockchain across 7 networks
- Track wallets, tokens, and fund flows
- Analyze competitors and market landscapes
- Get community intelligence from Reddit, GitHub, Hacker News, and the web

**Without revealing who they are, what they're looking for, or why.**

Every request is routed through Gensyn's AXL privacy network. Every result is encrypted with AES-256 and stored on 0G's decentralized storage. No centralized server ever sees both the query and the identity of the querier simultaneously.

---

## Why This Matters

### For Humans

A hedge fund analyst researching a competitor doesn't want that competitor to know. A journalist investigating a whale wallet doesn't want to tip them off. A patient researching a diagnosis doesn't want that data sold to insurers. A developer building in stealth mode doesn't want their research fingerprint exposed.

### For AI Agents

As AI agents proliferate — trading, researching, monitoring, deciding — they need data. Continuously. At scale. Right now every agent API call is logged, tracked, and profiled. Nexis is the **privacy primitive** that agents need to operate without leaking their strategy to the infrastructure they depend on.

### The Market Gap

| Existing Tool | What It Does | What It Leaks |
|---|---|---|
| Nansen / Dune | Powerful onchain intelligence | Your entire research agenda |
| Perplexity / ChatGPT | General research | Your queries, identity, intent |
| Direct RPC calls | Blockchain data | Your IP, wallet interests, timing |
| Ocean Protocol | Static datasets | Who bought what data |
| LangChain / AutoGPT | Agent orchestration | All queries to centralized APIs |

**Nobody combines intelligence + privacy + decentralization for live queries. Nexis does.**

---

## How It Works

```
User / Agent Query
        │
        ▼
┌───────────────────┐
│   Nexis Planner   │  ← LLM understands goal, builds execution plan
│  (Claude Opus)    │
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│              AXL Privacy Router               │
│         (Gensyn — P2P encrypted mesh)         │
│  All outbound requests routed through AXL     │
│  No IP, no identity, no query fingerprint     │
└────────────────────┬──────────────────────────┘
                     │
         ┌───────────┼───────────────┐
         ▼           ▼               ▼
   ┌──────────┐ ┌──────────┐ ┌──────────────┐
   │  Reddit  │ │  GitHub  │ │   7-Chain    │
   │  HN/Web  │ │  Issues  │ │  Blockchain  │
   │SearchAPI │ │          │ │  (via RPC)   │
   └──────────┘ └──────────┘ └──────────────┘
         │           │               │
         └───────────┼───────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │    Nexis Intelligence  │
        │  Dual-layer extraction │
        │  Semantic clustering   │
        │  Signal validation     │
        │  Scam detection        │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │    0G Decentralized    │
        │       Storage          │
        │  AES-256 encrypted     │
        │  Key stored locally    │
        │  Root hash on-chain    │
        └────────────────────────┘
```

---

## Privacy Architecture — How Private Is It?

### Layer 1: Request Privacy (Gensyn AXL)

Every single outbound request — RPC calls, Reddit scraping, GitHub API, SearchAPI, KeeperHub webhooks — is routed through Gensyn's AXL network.

AXL is a peer-to-peer encrypted mesh network. When Nexis queries Etherscan for a wallet's transaction history:
- The request originates from an AXL node, not your IP
- The AXL node's identity is cryptographically separated from yours
- Etherscan sees a request from the AXL network, not from you
- No single node in the AXL network knows both who you are and what you queried

**What this means:** Even if Etherscan, Reddit, or any data provider cooperates fully with law enforcement or is breached, they cannot identify who made the query.

### Layer 2: Storage Privacy (0G Storage)

Research results are never stored on a centralized server. After every research session:
- Results are serialized to JSON
- Encrypted with AES-256 using a key generated locally
- The encryption key is stored in local SQLite — never transmitted
- The encrypted blob is uploaded to 0G Storage (Galileo testnet)
- A root hash is returned and anchored on-chain

**What this means:** The encrypted data lives on a decentralized network. Without the local encryption key, the stored data is computationally indistinguishable from noise. Even 0G storage nodes cannot read your research.

### Layer 3: Payment Privacy (x402)

Research capabilities can be accessed and paid for anonymously via the x402 payment protocol — no account, no identity, just a payment and a result.

### What Nexis Cannot Protect Against

Intellectual honesty requires stating limits:

- **Local device compromise** — if your machine is compromised, the SQLite encryption key is accessible
- **Traffic analysis at scale** — a sufficiently resourced adversary monitoring the AXL network at a global scale might infer patterns over time
- **Content analysis** — if your query contains uniquely identifying information, privacy is only as strong as the query itself
- **Legal compulsion of the querier** — Nexis protects your data from third parties, not from legal orders directed at you personally

---

## Sensitive Use Cases

Nexis is specifically designed for research and intelligence gathering that requires privacy:

**Investigative Journalism**
A journalist investigating a DAO treasury drain can trace fund flows across multiple wallets and chains without alerting the subjects. Results stored encrypted mean even a seized laptop doesn't reveal the investigation.

**Competitive Intelligence**
A startup researching a competitor's pricing strategy, community complaints, and hiring signals doesn't want that competitor to see the query pattern. Nexis routes all competitive research through AXL.

**Whistleblower Research**
Someone investigating financial misconduct can analyze on-chain evidence, community sentiment, and public records without creating a traceable research fingerprint.

**DeFi Strategy**
A trader analyzing wallet clusters, token holder concentration, and community sentiment before a position doesn't want market makers to see their research agenda.

**Medical / Legal Research**
Sensitive topic research — medical conditions, legal situations — can be conducted without building a profile that gets sold to data brokers.

**Activist and Human Rights Work**
Research into surveillance infrastructure, authoritarian governance, or corporate misconduct can be conducted without alerting the subjects.

---

## Sponsor Integrations

### Gensyn AXL — Privacy Routing Layer

Every single outbound HTTP request from Nexis is routed through Gensyn's AXL network. Not selected requests — all of them.

- AXL node spawns automatically on startup
- Ed25519 identity key generated locally
- All RPC calls, API calls, web scraping go through AXL
- Node public key: logged on startup for verification
- P2P messaging verified end-to-end

```typescript
// Every request in Nexis goes through this
const router = getRouter(); // AXL privacy router
const response = await router.get(url, headers);
// Never: await fetch(url) directly
```

### 0G Storage — Decentralized Encrypted Memory

Every research session is encrypted and stored on 0G's Galileo testnet.

- AES-256 encryption with locally-generated key
- Key stored in SQLite, never transmitted
- Upload to 0G storage nodes with finality confirmation
- Root hash returned and stored for retrieval
- Sessions retrievable by root hash with decryption key

```
Session → Encrypt(AES-256, localKey) → Upload to 0G → rootHash
rootHash + localKey → Download from 0G → Decrypt → Session
```

Wallet: `0xc2E4d605ee5678F13C08ddF49B08d851FE683982` (Galileo testnet)

### KeeperHub — Autonomous Onchain Automation

Nexis integrates with KeeperHub bidirectionally — the most sophisticated use of KeeperHub in the hackathon:

**Direction A: KeeperHub triggers Nexis**

KeeperHub monitors the blockchain continuously. When conditions are met, it webhooks Nexis to run autonomous research:

```
KeeperHub: Check wallet balance every 15 min
→ Balance > threshold ETH?
→ YES: POST to Nexis webhook
→ Nexis: Run private wallet intelligence research
→ Results: Encrypted to 0G
→ KeeperHub: Send Telegram alert with summary
```

**Direction B: Nexis creates KeeperHub workflows**

Nexis uses the KeeperHub API to programmatically create monitoring workflows. Tell Nexis what to monitor, it creates the KeeperHub workflow automatically:

```
User: "Monitor Vitalik's wallet and alert me if he moves 50+ ETH"
Nexis: Creates 5-node KeeperHub workflow via API
→ Schedule trigger (every 15min)
→ Get Native Token Balance (web3/check-balance)
→ Condition (balance > 50 ETH)
→ Webhook to Nexis (trigger research)
→ Telegram notification
```

**Direction C: LLM-generated complex workflows**

Nexis uses an LLM call to design arbitrary KeeperHub workflows from natural language, then creates them via API:

```
User: "Every day check ETH price, if it moved 5%+, research sentiment and alert me"
Nexis LLM: Designs full workflow node structure
Nexis API: Creates workflow on KeeperHub
KeeperHub: Runs autonomously forever
```

**5 live workflows on KeeperHub:**
| Workflow | ID | Type |
|---|---|---|
| Nexis Whale Monitor — Vitalik (>5 ETH) | `inm921j374gf7rlka4zeo` | Balance monitor |
| Nexis Whale Monitor — Scam wallet (>0.1 ETH) | `ivc8ma1o17hjni1mpkaxn` | Scam detection |
| Nexis Scheduled — DeFi privacy research | `dt9k60zmfqh248m5gttia` | Weekly research |
| Nexis DeFi Monitor — Aave | `1qd27gt6g576mdmlq2g9v` | Protocol monitor |
| ETH Price Movement Alert | `9ms3bqjxxjietoh08pl2x` | LLM-generated |

---

## Research Capabilities

### Community Intelligence

Multi-source community research across Reddit, GitHub Issues, Hacker News, and the web.

**What makes it production-grade:**
- **Domain classifier** — automatically detects crypto/SaaS/devtools/general and applies appropriate thresholds
- **Dual-layer extraction** — behavioral pains (workflow, mindset) and technical pains (performance, pricing) extracted separately via two LLM passes
- **Semantic clustering** — "slow", "lag", "freeze" → `performance` cluster. Synonym normalization prevents fragmentation
- **Three-tier validation** — `CONFIRMED` (frequency ≥ 3), `STRONG_SIGNAL` (frequency ≥ 2 or viral single thread), `WEAK_SIGNAL`
- **Impact scoring** — `(frequency × 0.5) + (log(upvotes+1) × 0.5)` balances recurring complaints vs viral resonance
- **Source bias cap** — no single source contributes >35% of dataset
- **Contradiction detection** — if known product has zero complaints surfaced, flags extraction failure rather than reporting silence as satisfaction
- **Evidence anchoring** — every finding requires a direct quote from source data

**Example output for Notion:**
> *"I spent 3 years optimizing every second of my life... My Notion setup looked like a fucking NASA control center."*
> — Confirmed behavioral pain, `productivity_trap`, frequency: 3, impact: 6.8

### Onchain Intelligence

Multi-chain wallet and token analysis across 7 networks, all routed through AXL.

**Supported chains:** Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche

**Wallet Intelligence:**
- Balance across all chains simultaneously
- Transaction history and pattern analysis
- Token holdings from recent transfers
- Protocol interaction detection (Uniswap, Aave, Compound, etc.)
- Wallet classification: whale / trader / bot / holder
- Funding source tracing (where did the first ETH come from?)
- Activity level: high / medium / low / dormant

**Scam Detection:**
Nexis automatically detects malicious wallets:
- Homoglyph token detection (fake `ĖTĤ`, `ℰ⊤ℋ` tokens)
- Pass-through pattern analysis (funds in → funds out, near-zero retention)
- Bot automation signatures (uniform transfer sizes, templated amounts)
- Address poisoning indicators (vanity prefix analysis)
- Mule wallet lifecycle detection

**Proven on real wallets:**
- Vitalik's wallet: correctly identified as `vitalik.eth`, classified as "Founder/HODLer/Philanthropic Distributor", detected memecoin dump pattern
- Scam wallet `0x49CA...`: correctly classified as "address-poisoning mule", detected 4 homoglyph ETH tokens, identified pass-through economics

**Fund Flow Tracing:**
- Follows money hop by hop (configurable max hops)
- Detects consolidation patterns, mixer deposits, exchange flows
- Identifies wallet clustering (same entity controlling multiple wallets)

**Token Analysis:**
- Price and market data via DeFiLlama (free, no key)
- Top holder concentration
- Recent large transfers (>$10k threshold)
- Smart money movement detection

### Competitive Intelligence

Direct website scraping of competitor pages — pricing, features, positioning, blog content — all routed through AXL.

- Known domain normalization (40+ companies mapped to real domains)
- Multi-page scraping (pricing, features, blog, about)
- LLM analysis: weaknesses, opportunities, positioning gaps
- Steelman analysis — best-case for competitor, not just attack surface

### Market Research

Full market landscape analysis combining competitive scraping, community signals, and hiring data.

- Pricing landscape mapping
- Feature matrix across competitors
- Hiring signals (what roles are competitors adding?)
- HN and Product Hunt market interest
- Go-to-market recommendations with confidence levels

---

## Architecture

```
nexis/
├── src/
│   ├── privacy/
│   │   ├── axl.ts              — AXL node lifecycle (spawn, monitor, restart)
│   │   └── router.ts           — Privacy router (ALL requests go here)
│   ├── memory/
│   │   ├── local.ts            — SQLite cache + encryption key store
│   │   └── decentralized.ts    — 0G Storage SDK (upload/download/AES-256)
│   ├── agent/
│   │   ├── planner.ts          — Goal → execution plan via LLM
│   │   ├── executor.ts         — Capability chaining with context
│   │   ├── orchestrator.ts     — Full research loop + 0G storage
│   │   └── capabilities/
│   │       ├── community.ts    — Multi-source research (Reddit/GitHub/HN/Web)
│   │       ├── competitive.ts  — Competitor website scraping
│   │       ├── market.ts       — Market landscape analysis
│   │       ├── content.ts      — Content generation (blog/Twitter/LinkedIn)
│   │       ├── onchain.ts      — Wallet/token/fund flow intelligence
│   │       └── keeper.ts       — KeeperHub workflow creation
│   ├── services/
│   │   ├── keeperhub.ts        — KeeperHub API client (full)
│   │   ├── onchain.ts          — Multi-chain RPC + Etherscan V2
│   │   ├── reddit.ts           — Reddit scraper (domain-aware subreddits)
│   │   ├── github.ts           — GitHub Issues API
│   │   ├── hackernews.ts       — Algolia HN API
│   │   ├── websearch.ts        — SearchAPI (Google) + DDG fallback
│   │   ├── scraper.ts          — Web scraper (competitor sites)
│   │   └── llm.ts              — TokenRouter LLM wrapper
│   └── api/
│       ├── routes/
│       │   ├── research.ts     — POST /api/research/sync
│       │   └── keeper.ts       — POST /api/keeper/webhook
│       └── server.ts           — Express server
├── axl-node/
│   ├── axl                     — Gensyn AXL binary
│   └── config.json             — AXL configuration
└── .nexis/
    └── memory.db               — SQLite (sessions + encryption keys)
```

---

## API Reference

### Research

```bash
# Run research synchronously (wait for result)
POST /api/research/sync
{
  "goal": "Find pain points around DeFi privacy tools",
  "userId": "user-123"
}

# Run research in background
POST /api/research
{
  "goal": "Analyze this wallet: 0x...",
  "userId": "user-123"
}

# Retrieve encrypted session from 0G
POST /api/research/retrieve
{
  "rootHash": "0x...",
  "sessionId": "uuid"
}
```

### KeeperHub

```bash
# Create monitoring workflow
POST /api/keeper/create-monitor
{
  "type": "whale" | "scheduled" | "defi" | "generate",
  "target": "0x...",           # wallet or contract address
  "threshold": 100,            # ETH threshold
  "goal": "research goal",     # for scheduled/generate
  "telegramChatId": "..."      # optional Telegram alerts
}

# KeeperHub webhook (called by KeeperHub when events fire)
POST /api/keeper/webhook
{
  "type": "whale_movement" | "scheduled_research" | "defi_monitor",
  "address": "0x...",
  "threshold_eth": 100
}

# List all workflows
GET /api/keeper/workflows

# Health check
GET /health
```

---

## Setup

### Prerequisites

- Node.js 20+
- Go 1.21+ (for AXL binary, pre-built included)

### Install

```bash
git clone https://github.com/0xZaid10/Nexis
cd Nexis
npm install
```

### Environment

```bash
cp .env.example .env
```

```env
# LLM (TokenRouter — routes to Claude Opus)
ANTHROPIC_API_KEY=sk-...
ANTHROPIC_BASE_URL=https://api.tokenrouter.com
LLM_MODEL=anthropic/claude-opus-4.7

# 0G Storage (Galileo testnet)
ZG_PRIVATE_KEY=your_private_key
ZG_EVM_RPC=https://evmrpc-testnet.0g.ai
ZG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai

# AXL Privacy (auto-configured)
AXL_HOST=127.0.0.1
AXL_PORT=9002
AXL_BINARY_PATH=./axl-node/axl

# KeeperHub
KEEPERHUB_API_KEY=kh_...
KEEPERHUB_BASE_URL=https://app.keeperhub.com
KEEPERHUB_TELEGRAM_CONNECTION_ID=...

# Telegram
TELEGRAM_CHAT_ID=...

# Etherscan V2 (one key for all chains)
ETHERSCAN_API_KEY=...

# Search
SEARCH_API_KEY=...     # SearchAPI.io

# Public URL (for KeeperHub webhooks)
NEXIS_PUBLIC_URL=https://your-domain.com
```

### Run

```bash
npm run dev
```

Nexis starts:
1. SQLite memory initialized
2. 0G Storage connected
3. LLM service ready
4. AXL node spawned → privacy layer online
5. Express server listening on `:3000`

---

## Live Demo Queries

```bash
# Community research — any topic
curl -X POST http://localhost:3000/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{"goal": "Find pain points about Notion as a productivity tool", "userId": "demo"}'

# Wallet intelligence
curl -X POST http://localhost:3000/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{"goal": "Analyze wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "userId": "demo"}'

# Scam detection
curl -X POST http://localhost:3000/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{"goal": "Analyze wallet 0x49CAdA74991C0090AF0be3FD387B17f1Da9d903D", "userId": "demo"}'

# Market research — EV industry
curl -X POST http://localhost:3000/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{"goal": "Research EV market — Tesla pain points, competitor weaknesses, switching triggers", "userId": "demo"}'

# Create autonomous monitoring
curl -X POST http://localhost:3000/api/keeper/create-monitor \
  -H "Content-Type: application/json" \
  -d '{"type": "whale", "target": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "threshold": 50}'
```

---

## What Gets Proven

Every research session produces:

```json
{
  "success": true,
  "summary": "# Intelligence Report...",
  "results": [...],
  "storage": {
    "rootHash": "0x...",
    "txHash": "0x...",
    "encrypted": true
  },
  "routedViaAXL": true,
  "duration_ms": 147000
}
```

- `routedViaAXL: true` — every request went through the AXL privacy network
- `storage.encrypted: true` — results encrypted with AES-256
- `storage.rootHash` — verifiable on 0G Storage explorer
- `storage.txHash` — transaction hash on Galileo testnet

---

## The Vision

Nexis is built for a world where AI agents are the primary consumers of internet data.

In that world, every agent needs a privacy layer. An autonomous trading agent can't reveal its research strategy to the infrastructure it depends on. A medical AI can't leak patient query patterns to data brokers. An investigative agent can't alert its subjects by querying their wallets.

Nexis is the answer: **a private data access primitive that any agent or human can use to query the world without leaving a trace.**

The research layer is the first implementation. What follows is:
- An agent marketplace where agents pay each other via x402 for private research
- Cross-chain identity and reputation without deanonymization
- Private compute for sensitive queries via 0G Compute
- Agent-native APIs with metered anonymous access

The agentic internet needs a privacy layer. Nexis is building it.

---

## Builder

**0xZaid** ([@0x_Zaid10](https://twitter.com/0x_Zaid10))
Blockchain / Full-Stack Developer
ETHGlobal OpenAgents 2026 — Solo build

---

## License

MIT

*ETHGlobal OpenAgents 2026*

</div>
