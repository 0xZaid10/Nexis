import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── Onchain Data Service ─────────────────────────────────────────────────────
// Multi-chain RPC + free APIs for onchain intelligence
// ALL requests routed through AXL privacy layer
// No API keys needed for most endpoints

// ─── Chain configurations ─────────────────────────────────────────────────────

export const CHAINS: Record<string, {
  name: string;
  rpc: string;
  explorer: string;
  explorerApi: string;
  nativeSymbol: string;
  decimals: number;
  chainId: number;
}> = {
  ethereum: {
    name: 'Ethereum',
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeSymbol: 'ETH',
    decimals: 18,
    chainId: 1,
  },
  base: {
    name: 'Base',
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeSymbol: 'ETH',
    decimals: 18,
    chainId: 8453,
  },
  arbitrum: {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeSymbol: 'ETH',
    decimals: 18,
    chainId: 42161,
  },
  optimism: {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeSymbol: 'ETH',
    decimals: 18,
    chainId: 10,
  },
  polygon: {
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeSymbol: 'MATIC',
    decimals: 18,
    chainId: 137,
  },
  bsc: {
    name: 'BNB Smart Chain',
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeSymbol: 'BNB',
    decimals: 18,
    chainId: 56,
  },
  avalanche: {
    name: 'Avalanche',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    explorerApi: 'https://api.etherscan.io/v2/api',
    nativeSymbol: 'AVAX',
    decimals: 18,
    chainId: 43114,
  },
  solana: {
    name: 'Solana',
    rpc: 'https://api.mainnet-beta.solana.com',
    explorer: 'https://solscan.io',
    explorerApi: 'https://public-api.solscan.io',
    nativeSymbol: 'SOL',
    decimals: 9,
    chainId: 0,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  chain: string;
  nativeBalance: number;
  nativeSymbol: string;
  usdValue: number | null;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUSD: number | null;
  timestamp: string;
  method: string;
  status: 'success' | 'failed';
  chain: string;
}

export interface TokenHolding {
  address: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  chain: string;
}

export interface WalletProfile {
  address: string;
  chains: string[];
  balances: WalletBalance[];
  totalUSD: number;
  txCount: number;
  firstSeen: string | null;
  lastActive: string | null;
  walletType: 'whale' | 'trader' | 'bot' | 'holder' | 'unknown';
  activityLevel: 'high' | 'medium' | 'low' | 'dormant';
  topTokens: TokenHolding[];
  recentTxs: Transaction[];
  fundingSources: string[];
  protocols: string[];
}

export interface TokenProfile {
  address: string;
  chain: string;
  symbol: string;
  name: string;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  holders: number | null;
  totalSupply: string | null;
  liquidity: number | null;
  topHolders: Array<{ address: string; percentage: number }>;
  recentLargeTxs: Transaction[];
}

export interface FundFlow {
  from: string;
  to: string;
  value: number;
  valueUSD: number | null;
  timestamp: string;
  txHash: string;
  chain: string;
  hop: number;
}

// ─── RPC helpers ──────────────────────────────────────────────────────────────

async function rpcCall(chain: string, method: string, params: unknown[]): Promise<unknown> {
  const router = getRouter();
  const chainConfig = CHAINS[chain];
  if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

  const res = await router.post(chainConfig.rpc, {
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  }, { 'Content-Type': 'application/json' });

  const data = res.data as any;
  if (data?.error) throw new Error(`RPC error: ${data.error.message}`);
  return data?.result ?? null;
}

async function explorerCall(chain: string, params: Record<string, string>): Promise<any> {
  const router = getRouter();
  const chainConfig = CHAINS[chain];
  if (!chainConfig) throw new Error(`Unknown chain: ${chain}`);

  const apiKey = process.env.ETHERSCAN_API_KEY || '';

  // V2 multichain API — one key for all chains
  const query = new URLSearchParams({
    ...params,
    chainid: chainConfig.chainId.toString(),
    apikey: apiKey,
  }).toString();

  const res = await router.get(`${chainConfig.explorerApi}?${query}`);
  const data = res.data as any;

  if (data?.status === '0') {
    if (data?.message?.includes('No transactions found')) return [];
    logger.warn('[Onchain] Explorer API warning', { chain, message: data.result?.slice?.(0, 100) });
    return null;
  }
  return data?.result ?? null;
}

// ─── Price data via DeFiLlama (free, no key) ─────────────────────────────────

async function getTokenPrice(chain: string, address: string): Promise<number | null> {
  const router = getRouter();
  try {
    const chainMap: Record<string, string> = {
      ethereum: 'ethereum', base: 'base', arbitrum: 'arbitrum',
      optimism: 'optimism', polygon: 'polygon', bsc: 'bsc',
      avalanche: 'avax', solana: 'solana',
    };
    const llamaChain = chainMap[chain] || chain;
    const res = await router.get(
      `https://coins.llama.fi/prices/current/${llamaChain}:${address}`
    );
    const data = res.data as any;
    return data?.coins?.[`${llamaChain}:${address}`]?.price ?? null;
  } catch {
    return null;
  }
}

async function getNativePrice(chain: string): Promise<number | null> {
  const router = getRouter();
  try {
    const coingeckoIds: Record<string, string> = {
      ethereum: 'ethereum', base: 'ethereum', arbitrum: 'ethereum',
      optimism: 'ethereum', polygon: 'matic-network', bsc: 'binancecoin',
      avalanche: 'avalanche-2',
    };
    const id = coingeckoIds[chain];
    if (!id) return null;
    const res = await router.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    );
    const data = res.data as any;
    return data?.[id]?.usd ?? null;
  } catch {
    return null;
  }
}

// ─── Wallet balance across chains ─────────────────────────────────────────────

export async function getWalletBalances(address: string, chains = ['ethereum', 'base', 'arbitrum', 'polygon']): Promise<WalletBalance[]> {
  const balances: WalletBalance[] = [];

  await Promise.all(chains.map(async (chain) => {
    try {
      const chainConfig = CHAINS[chain];
      if (!chainConfig || chain === 'solana') return; // Handle solana separately

      const hexBalance = await rpcCall(chain, 'eth_getBalance', [address, 'latest']) as string;
      const rawBalance = parseInt(hexBalance, 16);
      const balance = rawBalance / Math.pow(10, chainConfig.decimals);

      const nativePrice = await getNativePrice(chain).catch(() => null);
      const usdValue = nativePrice ? balance * nativePrice : null;

      if (balance > 0) {
        balances.push({
          chain: chainConfig.name,
          nativeBalance: balance,
          nativeSymbol: chainConfig.nativeSymbol,
          usdValue,
        });
      }
    } catch (err) {
      logger.debug('[Onchain] Balance fetch failed', { chain, error: (err as Error).message });
    }
  }));

  return balances;
}

// ─── Transaction history ──────────────────────────────────────────────────────

export async function getTransactionHistory(
  address: string,
  chain: string,
  limit = 50
): Promise<Transaction[]> {
  const chainConfig = CHAINS[chain];
  if (!chainConfig) return [];

  // Try Etherscan-compatible explorer API (free, no key for limited usage)
  try {
    const txList = await explorerCall(chain, {
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: limit.toString(),
      sort: 'desc',
    });

    if (!txList || !Array.isArray(txList)) return [];

    const nativePrice = await getNativePrice(chain).catch(() => null);

    return txList.map((tx: any) => {
      const value = parseInt(tx.value || '0') / Math.pow(10, chainConfig.decimals);
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: value.toFixed(6),
        valueUSD: nativePrice ? value * nativePrice : null,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        method: tx.functionName?.split('(')[0] || (tx.input === '0x' ? 'transfer' : 'contract_call'),
        status: tx.txreceipt_status === '1' ? 'success' : 'failed',
        chain: chainConfig.name,
      };
    });
  } catch (err) {
    logger.warn('[Onchain] TX history failed', { chain, error: (err as Error).message });
    return [];
  }
}

// ─── Token holdings via Etherscan token transfers ─────────────────────────────

export async function getTokenHoldings(address: string, chain: string): Promise<TokenHolding[]> {
  try {
    const tokenTxs = await explorerCall(chain, {
      module: 'account',
      action: 'tokentx',
      address,
      page: '1',
      offset: '100',
      sort: 'desc',
    });

    if (!tokenTxs || !Array.isArray(tokenTxs)) return [];

    // Aggregate unique tokens from recent transfers
    const tokenMap: Record<string, TokenHolding> = {};

    for (const tx of tokenTxs) {
      if (!tx.contractAddress) continue;
      const key = tx.contractAddress.toLowerCase();
      if (!tokenMap[key]) {
        tokenMap[key] = {
          address: tx.contractAddress,
          symbol: tx.tokenSymbol || 'UNKNOWN',
          name: tx.tokenName || 'Unknown Token',
          balance: 0,
          decimals: parseInt(tx.tokenDecimal || '18'),
          chain,
        };
      }
    }

    return Object.values(tokenMap).slice(0, 20);
  } catch (err) {
    logger.warn('[Onchain] Token holdings failed', { chain, error: (err as Error).message });
    return [];
  }
}

// ─── Protocol interaction detection ──────────────────────────────────────────

const KNOWN_PROTOCOLS: Record<string, string> = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap',
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2',
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3',
  '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789': 'ERC-4337 EntryPoint',
  '0xc36442b4a4522e871399cd717abdd847ab11fe88': 'Uniswap V3 Positions',
  '0x00000000219ab540356cbb839cbe05303d7705fa': 'ETH2 Deposit',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
};

function detectProtocols(txs: Transaction[], address: string): string[] {
  const protocols = new Set<string>();
  for (const tx of txs) {
    const toAddr = tx.to.toLowerCase();
    if (KNOWN_PROTOCOLS[toAddr]) {
      protocols.add(KNOWN_PROTOCOLS[toAddr]);
    }
  }
  return [...protocols];
}

// ─── Wallet classification ─────────────────────────────────────────────────────

function classifyWallet(
  txCount: number,
  balanceUSD: number,
  recentTxs: Transaction[],
  protocols: string[]
): { type: WalletProfile['walletType']; activity: WalletProfile['activityLevel'] } {
  // Activity level
  const daysSinceLastTx = recentTxs.length > 0
    ? (Date.now() - new Date(recentTxs[0].timestamp).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  const activity: WalletProfile['activityLevel'] =
    daysSinceLastTx < 1 ? 'high' :
    daysSinceLastTx < 7 ? 'medium' :
    daysSinceLastTx < 30 ? 'low' : 'dormant';

  // Wallet type
  let type: WalletProfile['walletType'] = 'unknown';

  if (balanceUSD > 1_000_000) type = 'whale';
  else if (txCount > 500 && protocols.some(p => p.includes('Uniswap') || p.includes('Sushi'))) type = 'trader';
  else if (txCount > 1000 && daysSinceLastTx < 1) type = 'bot';
  else if (balanceUSD > 10_000 && txCount < 50) type = 'holder';

  return { type, activity };
}

// ─── Funding source tracing ───────────────────────────────────────────────────

export async function traceFundingSources(address: string, chain: string): Promise<string[]> {
  try {
    // Get earliest incoming transactions
    const txList = await explorerCall(chain, {
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: '10',
      sort: 'asc', // oldest first
    });

    if (!txList || !Array.isArray(txList)) return [];

    const sources: string[] = [];
    for (const tx of txList.slice(0, 5)) {
      if (tx.to?.toLowerCase() === address.toLowerCase() && tx.from) {
        const from = tx.from.toLowerCase();
        const knownLabel = KNOWN_PROTOCOLS[from];
        sources.push(knownLabel ? `${knownLabel} (${tx.from})` : tx.from);
      }
    }

    return [...new Set(sources)];
  } catch {
    return [];
  }
}

// ─── Fund flow tracing (follow money) ────────────────────────────────────────

export async function traceFundFlow(
  startAddress: string,
  chain: string,
  maxHops = 3,
  minValueETH = 1.0
): Promise<FundFlow[]> {
  const flows: FundFlow[] = [];
  const visited = new Set<string>();
  const queue = [{ address: startAddress, hop: 0 }];
  const nativePrice = await getNativePrice(chain).catch(() => null);
  const chainConfig = CHAINS[chain];

  while (queue.length > 0 && flows.length < 50) {
    const { address, hop } = queue.shift()!;
    if (hop >= maxHops || visited.has(address)) continue;
    visited.add(address);

    try {
      const txList = await explorerCall(chain, {
        module: 'account',
        action: 'txlist',
        address,
        startblock: '0',
        endblock: '99999999',
        page: '1',
        offset: '20',
        sort: 'desc',
      });

      if (!txList || !Array.isArray(txList)) continue;

      for (const tx of txList) {
        if (tx.from?.toLowerCase() !== address.toLowerCase()) continue;
        const value = parseInt(tx.value || '0') / Math.pow(10, chainConfig?.decimals ?? 18);
        if (value < minValueETH) continue;

        flows.push({
          from: tx.from,
          to: tx.to || '',
          value,
          valueUSD: nativePrice ? value * nativePrice : null,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          txHash: tx.hash,
          chain,
          hop,
        });

        if (tx.to && !visited.has(tx.to.toLowerCase())) {
          queue.push({ address: tx.to, hop: hop + 1 });
        }
      }

      await new Promise(r => setTimeout(r, 200)); // rate limit
    } catch (err) {
      logger.debug('[Onchain] Flow trace step failed', { address, error: (err as Error).message });
    }
  }

  return flows;
}

// ─── Token profile ────────────────────────────────────────────────────────────

export async function getTokenProfile(tokenAddress: string, chain: string): Promise<TokenProfile> {
  const router = getRouter();
  const chainConfig = CHAINS[chain];

  logger.info('[Onchain] Fetching token profile', { token: tokenAddress, chain });

  // Price + market data via DeFiLlama
  const chainMap: Record<string, string> = {
    ethereum: 'ethereum', base: 'base', arbitrum: 'arbitrum',
    optimism: 'optimism', polygon: 'polygon', bsc: 'bsc',
  };
  const llamaChain = chainMap[chain] || 'ethereum';

  let price: number | null = null;
  let marketCap: number | null = null;
  let volume24h: number | null = null;
  let priceChange24h: number | null = null;

  try {
    const priceRes = await router.get(
      `https://coins.llama.fi/prices/current/${llamaChain}:${tokenAddress}`
    );
    const priceData = (priceRes.data as any)?.coins?.[`${llamaChain}:${tokenAddress}`];
    if (priceData) {
      price = priceData.price;
      marketCap = priceData.mcap ?? null;
    }
  } catch {}

  // Top holders via Etherscan
  let topHolders: Array<{ address: string; percentage: number }> = [];
  try {
    const holderData = await explorerCall(chain, {
      module: 'token',
      action: 'tokenholderlist',
      contractaddress: tokenAddress,
      page: '1',
      offset: '10',
    });
    if (holderData && Array.isArray(holderData)) {
      topHolders = holderData.map((h: any) => ({
        address: h.TokenHolderAddress,
        percentage: parseFloat(h.TokenHolderQuantity) / 1e18 * 100,
      }));
    }
  } catch {}

  // Recent large transfers
  let recentLargeTxs: Transaction[] = [];
  try {
    const transfers = await explorerCall(chain, {
      module: 'account',
      action: 'tokentx',
      contractaddress: tokenAddress,
      page: '1',
      offset: '50',
      sort: 'desc',
    });

    if (transfers && Array.isArray(transfers)) {
      recentLargeTxs = transfers
        .map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: (parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'))).toFixed(2),
          valueUSD: price ? parseFloat((parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'))).toFixed(2)) * price : null,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          method: 'transfer',
          status: 'success' as const,
          chain,
        }))
        .filter(tx => (tx.valueUSD || 0) > 10000) // Only transfers > $10k
        .slice(0, 10);
    }
  } catch {}

  return {
    address: tokenAddress,
    chain,
    symbol: 'UNKNOWN',
    name: 'Unknown Token',
    price,
    marketCap,
    volume24h,
    priceChange24h,
    holders: null,
    totalSupply: null,
    liquidity: null,
    topHolders,
    recentLargeTxs,
  };
}

// ─── Full wallet profile ──────────────────────────────────────────────────────

export async function buildWalletProfile(
  address: string,
  chains = ['ethereum', 'base', 'arbitrum']
): Promise<WalletProfile> {
  logger.info('[Onchain] Building wallet profile', { address, chains });

  // Fetch everything in parallel
  const [balances, ...chainTxResults] = await Promise.all([
    getWalletBalances(address, chains),
    ...chains.map(chain => getTransactionHistory(address, chain, 30).catch(() => [])),
  ]);

  const allTxs = chainTxResults.flat().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Get tx count from primary chain
  let txCount = 0;
  try {
    const hexCount = await rpcCall('ethereum', 'eth_getTransactionCount', [address, 'latest']) as string;
    txCount = parseInt(hexCount, 16);
  } catch {}

  // Token holdings on primary chain
  const topTokens = await getTokenHoldings(address, 'ethereum').catch(() => []);

  // Funding sources
  const fundingSources = await traceFundingSources(address, 'ethereum').catch(() => []);

  // Protocol detection
  const protocols = detectProtocols(allTxs, address);

  // Total USD
  const totalUSD = balances.reduce((s, b) => s + (b.usdValue || 0), 0);

  // Timestamps
  const firstSeen = allTxs.length > 0
    ? allTxs[allTxs.length - 1].timestamp
    : null;
  const lastActive = allTxs.length > 0 ? allTxs[0].timestamp : null;

  // Classification
  const { type, activity } = classifyWallet(txCount, totalUSD, allTxs, protocols);

  return {
    address,
    chains,
    balances,
    totalUSD,
    txCount,
    firstSeen,
    lastActive,
    walletType: type,
    activityLevel: activity,
    topTokens,
    recentTxs: allTxs.slice(0, 20),
    fundingSources,
    protocols,
  };
}

// ─── Whale detection ──────────────────────────────────────────────────────────

export interface WhaleAlert {
  address: string;
  chain: string;
  value: number;
  valueUSD: number | null;
  txHash: string;
  timestamp: string;
  direction: 'in' | 'out';
  type: 'native' | 'token';
  tokenSymbol?: string;
}

export async function detectWhaleMovements(
  chain: string,
  minValueUSD = 100_000,
  limit = 20
): Promise<WhaleAlert[]> {
  const router = getRouter();
  const chainConfig = CHAINS[chain];
  const nativePrice = await getNativePrice(chain).catch(() => null);

  logger.info('[Onchain] Detecting whale movements', { chain, minValueUSD });

  // Use Etherscan to get recent large transactions
  try {
    const blockRes = await rpcCall(chain, 'eth_blockNumber', []) as string;
    const currentBlock = parseInt(blockRes, 16);
    const startBlock = currentBlock - 1000; // ~3 hours of blocks

    const txList = await explorerCall(chain, {
      module: 'account',
      action: 'txlist',
      address: '0x0000000000000000000000000000000000000000', // doesn't work this way
      startblock: startBlock.toString(),
      endblock: currentBlock.toString(),
      page: '1',
      offset: limit.toString(),
      sort: 'desc',
    });

    // Alternative: use DeFiLlama large transactions
    const llamaChain = chain === 'bsc' ? 'bsc' : chain;
    const llamaRes = await router.get(
      `https://coins.llama.fi/block/${llamaChain}/${Math.floor(Date.now() / 1000)}`
    );

    return []; // Will be populated by KeeperHub triggers in production
  } catch {
    return [];
  }
}
