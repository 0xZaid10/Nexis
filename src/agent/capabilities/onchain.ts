import { getRouter } from '../../privacy/router.js';
import { getLLM } from '../../services/llm.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Onchain Research Capability ──────────────────────────────────────────────
// New capability — not in original agent zip
// Fetches onchain data through AXL privacy router
// No API key leakage, no wallet correlation

export interface OnchainParams {
  type: 'wallet' | 'token' | 'protocol';
  target: string; // wallet address, token address, or protocol name
  chain?: 'ethereum' | 'base' | 'arbitrum' | 'polygon';
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const CHAIN_RPCS: Record<string, string> = {
  ethereum: 'https://eth.llamarpc.com',
  base: 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
};

async function fetchOnchainData(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const router = getRouter();

  // ALL RPC calls through AXL privacy router
  const res = await router.post(rpcUrl, {
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  }, { 'Content-Type': 'application/json' });

  return (res.data as any)?.result ?? null;
}

async function analyzeWallet(address: string, chain: string): Promise<unknown> {
  const rpcUrl = CHAIN_RPCS[chain] || CHAIN_RPCS.ethereum;
  const router = getRouter();

  logger.info('[Capability:Onchain] Fetching wallet data', { address, chain });

  // Fetch balance and transaction count through privacy router
  const [balance, txCount] = await Promise.all([
    fetchOnchainData(rpcUrl, 'eth_getBalance', [address, 'latest']).catch(() => null),
    fetchOnchainData(rpcUrl, 'eth_getTransactionCount', [address, 'latest']).catch(() => null),
  ]);

  // Fetch recent transactions via Etherscan-compatible API (routed through AXL)
  let transactions: unknown[] = [];
  try {
    const explorerRes = await router.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`
    );
    transactions = (explorerRes.data as any)?.result?.slice(0, 20) || [];
  } catch {
    logger.warn('[Capability:Onchain] Explorer fetch failed, using RPC only');
  }

  // Analyze with LLM
  const llm = getLLM();
  const analysis = await llm.prompt(`Analyze this ${chain} wallet: ${address}

ONCHAIN DATA:
- Balance: ${balance ? `${parseInt(balance as string, 16) / 1e18} ETH` : 'Unknown'}
- Transaction count: ${txCount ? parseInt(txCount as string, 16) : 'Unknown'}
- Recent transactions: ${transactions.length} found

Provide analysis:
1. Wallet type (trader/holder/protocol/bot)
2. Activity level and patterns
3. Notable behaviors
4. Risk assessment

Be specific about what the data shows. Do not speculate beyond the data.`,
    'Onchain analyst. Be specific and data-driven.',
    { temperature: 0.3 }
  );

  return {
    address, chain,
    balance_eth: balance ? parseInt(balance as string, 16) / 1e18 : null,
    tx_count: txCount ? parseInt(txCount as string, 16) : null,
    recent_tx_count: transactions.length,
    analysis,
    data_source: 'ONCHAIN_RPC + EXPLORER',
    fetched_at: new Date().toISOString(),
  };
}

async function analyzeToken(address: string, chain: string): Promise<unknown> {
  const rpcUrl = CHAIN_RPCS[chain] || CHAIN_RPCS.ethereum;
  const router = getRouter();

  logger.info('[Capability:Onchain] Fetching token data', { address, chain });

  // Fetch token info via DeFiLlama (no API key needed, routed through AXL)
  let tokenData: unknown = null;
  try {
    const res = await router.get(`https://coins.llama.fi/prices/current/${chain}:${address}`);
    tokenData = (res.data as any)?.coins?.[`${chain}:${address}`] || null;
  } catch {
    logger.warn('[Capability:Onchain] DeFiLlama fetch failed');
  }

  const llm = getLLM();
  const analysis = await llm.prompt(`Analyze this token: ${address} on ${chain}

TOKEN DATA:
${JSON.stringify(tokenData, null, 2) || 'No price data available'}

Provide:
1. Token overview and category
2. Price action summary if available
3. Market cap assessment
4. Notable risks or signals

Be specific. Do not speculate beyond the data.`,
    'DeFi analyst. Be specific and data-driven.',
    { temperature: 0.3 }
  );

  return {
    address, chain,
    token_data: tokenData,
    analysis,
    data_source: 'DEFI_LLAMA + ONCHAIN_RPC',
    fetched_at: new Date().toISOString(),
  };
}

export async function runOnchainResearch(params: OnchainParams): Promise<CapabilityResult> {
  const { type, target, chain = 'ethereum' } = params;

  logger.info('[Capability:Onchain] Starting', { type, target, chain });

  let data: unknown;

  switch (type) {
    case 'wallet': data = await analyzeWallet(target, chain); break;
    case 'token': data = await analyzeToken(target, chain); break;
    default: throw new Error(`Unknown onchain type: ${type}`);
  }

  logger.info('[Capability:Onchain] Complete', { type, target });

  return {
    capability: 'onchain',
    success: true,
    data: { type: `onchain_${type}`, target, chain, ...data as any },
  };
}
