import { getLLM } from '../../services/llm.js';
import {
  buildWalletProfile,
  getTokenProfile,
  traceFundFlow,
  detectWhaleMovements,
  CHAINS,
} from '../../services/onchain.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Onchain Research Capability ──────────────────────────────────────────────
// Multi-chain wallet intelligence, token tracking, fund flow analysis
// All data fetched through AXL privacy router
// No user identity or IP exposed to any RPC or explorer

export interface OnchainParams {
  type: 'wallet' | 'token' | 'fundflow' | 'whale_detection';
  target: string;
  chain?: string;
  chains?: string[];
  maxHops?: number;
  minValueUSD?: number;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function parseJSON(raw: string): unknown {
  try {
    const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
    return f !== -1 ? JSON.parse(raw.slice(f, l + 1)) : {};
  } catch { return {}; }
}

// ─── Wallet analysis ──────────────────────────────────────────────────────────

async function analyzeWallet(params: OnchainParams): Promise<CapabilityResult> {
  const { target, chains = ['ethereum', 'base', 'arbitrum', 'polygon'] } = params;
  const llm = getLLM();
  const mem = getLocalMemory();

  logger.info('[Capability:Onchain] Analyzing wallet', { address: target, chains });

  const profile = await buildWalletProfile(target, chains);

  // LLM analysis
  const analysisPrompt = `Analyze this blockchain wallet profile and provide intelligence.

WALLET: ${target}
CHAINS CHECKED: ${chains.join(', ')}

BALANCES:
${profile.balances.map(b => `- ${b.chain}: ${b.nativeBalance.toFixed(4)} ${b.nativeSymbol} (~$${b.usdValue?.toLocaleString() ?? 'unknown'})`).join('\n')}
TOTAL USD VALUE: $${profile.totalUSD.toLocaleString()}

ACTIVITY:
- Transaction count: ${profile.txCount}
- First seen: ${profile.firstSeen ?? 'unknown'}
- Last active: ${profile.lastActive ?? 'unknown'}
- Wallet type (classified): ${profile.walletType}
- Activity level: ${profile.activityLevel}

PROTOCOLS USED:
${profile.protocols.length > 0 ? profile.protocols.join(', ') : 'None detected'}

FUNDING SOURCES:
${profile.fundingSources.length > 0 ? profile.fundingSources.join('\n') : 'No clear funding sources found'}

TOP RECENT TRANSACTIONS (last 20):
${profile.recentTxs.slice(0, 10).map(tx =>
  `- ${tx.method} | ${parseFloat(tx.value).toFixed(4)} ${tx.chain} | $${tx.valueUSD?.toFixed(0) ?? '?'} | ${tx.timestamp.split('T')[0]}`
).join('\n')}

TOKEN INTERACTIONS:
${profile.topTokens.slice(0, 8).map(t => `- ${t.symbol} (${t.name})`).join('\n') || 'None detected'}

Provide a comprehensive intelligence report covering:
1. Wallet classification and confidence level
2. Behavioral patterns (what is this wallet doing?)
3. Notable activity or red flags
4. Protocol usage and DeFi sophistication
5. Estimated identity category (retail, institutional, protocol, bot)
6. Risk assessment (mixer interactions, suspicious patterns)
7. Key insights for research purposes

Be specific about what data confirms each claim.`;

  const analysis = await llm.prompt(analysisPrompt,
    'You are an onchain intelligence analyst. Be specific and data-driven. Flag any suspicious patterns.',
    { temperature: 0.3 }
  );

  mem.set(`wallet_${target.slice(0, 10)}_${Date.now()}`, {
    address: target,
    type: profile.walletType,
    totalUSD: profile.totalUSD,
    analyzed_at: new Date().toISOString(),
  });

  return {
    capability: 'onchain',
    success: true,
    data: {
      type: 'wallet_intelligence',
      address: target,
      chains_analyzed: chains,
      run_at: new Date().toISOString(),
      profile: {
        wallet_type: profile.walletType,
        activity_level: profile.activityLevel,
        total_usd: profile.totalUSD,
        tx_count: profile.txCount,
        first_seen: profile.firstSeen,
        last_active: profile.lastActive,
        protocols: profile.protocols,
        funding_sources: profile.fundingSources,
        balances: profile.balances,
        top_tokens: profile.topTokens.slice(0, 10),
        recent_txs: profile.recentTxs.slice(0, 20),
      },
      analysis,
      privacy: {
        routed_via_axl: true,
        no_identity_exposed: true,
        chains_queried: chains,
      },
    },
  };
}

// ─── Token analysis ───────────────────────────────────────────────────────────

async function analyzeToken(params: OnchainParams): Promise<CapabilityResult> {
  const { target, chain = 'ethereum' } = params;
  const llm = getLLM();

  logger.info('[Capability:Onchain] Analyzing token', { token: target, chain });

  const profile = await getTokenProfile(target, chain);

  const analysisPrompt = `Analyze this token's onchain data and provide intelligence.

TOKEN: ${target}
CHAIN: ${chain}

MARKET DATA:
- Price: $${profile.price?.toFixed(6) ?? 'unknown'}
- Market Cap: $${profile.marketCap?.toLocaleString() ?? 'unknown'}
- 24h Volume: $${profile.volume24h?.toLocaleString() ?? 'unknown'}
- 24h Change: ${profile.priceChange24h?.toFixed(2) ?? 'unknown'}%

TOP HOLDERS:
${profile.topHolders.slice(0, 5).map((h, i) =>
  `${i+1}. ${h.address} — ${h.percentage.toFixed(2)}%`
).join('\n') || 'No holder data available'}

RECENT LARGE TRANSACTIONS (>$10k):
${profile.recentLargeTxs.slice(0, 5).map(tx =>
  `- $${tx.valueUSD?.toLocaleString() ?? '?'} | ${tx.from.slice(0,8)}... → ${tx.to.slice(0,8)}... | ${tx.timestamp.split('T')[0]}`
).join('\n') || 'No large transactions found'}

Provide intelligence on:
1. Token health and legitimacy signals
2. Concentration risk (top holders %)
3. Smart money activity patterns
4. Recent whale movements and implications
5. Buy/sell pressure signals
6. Risk flags (rug pull indicators, suspicious patterns)
7. Overall assessment for research purposes`;

  const analysis = await llm.prompt(analysisPrompt,
    'You are an onchain token intelligence analyst. Be specific about risks and patterns.',
    { temperature: 0.3 }
  );

  return {
    capability: 'onchain',
    success: true,
    data: {
      type: 'token_intelligence',
      address: target,
      chain,
      run_at: new Date().toISOString(),
      profile,
      analysis,
      privacy: { routed_via_axl: true, no_identity_exposed: true },
    },
  };
}

// ─── Fund flow tracing ────────────────────────────────────────────────────────

async function traceFunds(params: OnchainParams): Promise<CapabilityResult> {
  const { target, chain = 'ethereum', maxHops = 3, minValueUSD = 10_000 } = params;
  const llm = getLLM();

  // Convert USD to ETH roughly
  const minValueETH = minValueUSD / 3000; // rough ETH price

  logger.info('[Capability:Onchain] Tracing fund flow', { address: target, chain, maxHops });

  const flows = await traceFundFlow(target, chain, maxHops, minValueETH);

  if (flows.length === 0) {
    return {
      capability: 'onchain',
      success: true,
      data: {
        type: 'fund_flow',
        address: target,
        chain,
        message: 'No significant fund flows detected above threshold',
        threshold_usd: minValueUSD,
        hops_checked: maxHops,
      },
    };
  }

  // Build flow summary for LLM
  const flowSummary = flows.map((f, i) =>
    `Hop ${f.hop}: ${f.from.slice(0,8)}... → ${f.to.slice(0,8)}... | ${f.value.toFixed(4)} ETH ($${f.valueUSD?.toFixed(0) ?? '?'}) | ${f.timestamp.split('T')[0]}`
  ).join('\n');

  const analysis = await llm.prompt(`Analyze this fund flow trace and identify patterns.

STARTING ADDRESS: ${target}
CHAIN: ${chain}
MAX HOPS: ${maxHops}
MIN VALUE: $${minValueUSD.toLocaleString()}

FUND FLOWS DETECTED:
${flowSummary}

Provide:
1. Flow pattern summary (linear, fan-out, consolidation, mixing)
2. Notable destinations (exchanges, protocols, known addresses)
3. Velocity analysis (how fast funds moved)
4. Risk indicators (tumbling patterns, exchange deposits suggesting sell pressure)
5. Cluster analysis (are multiple addresses controlled by same entity?)
6. Overall intelligence summary`,
    'You are an onchain forensics analyst specializing in fund flow tracing.',
    { temperature: 0.3 }
  );

  return {
    capability: 'onchain',
    success: true,
    data: {
      type: 'fund_flow',
      address: target,
      chain,
      run_at: new Date().toISOString(),
      flows_detected: flows.length,
      total_value_traced: flows.reduce((s, f) => s + (f.valueUSD || 0), 0),
      flows: flows.slice(0, 30),
      analysis,
      privacy: { routed_via_axl: true },
    },
  };
}

// ─── Main capability ──────────────────────────────────────────────────────────

export async function runOnchainResearch(params: OnchainParams): Promise<CapabilityResult> {
  const { type } = params;

  logger.info('[Capability:Onchain] Starting', { type, target: params.target });

  try {
    switch (type) {
      case 'wallet':    return await analyzeWallet(params);
      case 'token':     return await analyzeToken(params);
      case 'fundflow':  return await traceFunds(params);
      default:
        throw new Error(`Unknown onchain research type: ${type}`);
    }
  } catch (err) {
    logger.error('[Capability:Onchain] Failed', { error: (err as Error).message });
    return {
      capability: 'onchain',
      success: false,
      error: (err as Error).message,
      data: { type, target: params.target },
    };
  }
}
