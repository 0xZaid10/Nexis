import { z } from 'zod';
import dotenv from 'dotenv';
import type { NexisConfig } from '../types/index.js';

dotenv.config();

const configSchema = z.object({
  anthropicApiKey: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  zgPrivateKey: z.string().default(''),
  zgEvmRpc: z.string().url().default('https://evmrpc-testnet.0g.ai'),
  zgIndexerRpc: z.string().url().default('https://indexer-storage-testnet-turbo.0g.ai'),
  axlHost: z.string().default('127.0.0.1'),
  axlPort: z.coerce.number().default(8080),
  axlBinaryPath: z.string().default('./axl-node/axl'),
  x402WalletPrivateKey: z.string().default(''),
  x402RpcUrl: z.string().url().default('https://mainnet.base.org'),
  ensRpcUrl: z.string().url().default('https://eth.llamarpc.com'),
  keeperHubApiKey: z.string().default(''),
  keeperHubWebhookSecret: z.string().default(''),
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.string().default('info'),
  sqlitePath: z.string().default('./.nexis/memory.db'),
});

export function loadConfig(): NexisConfig {
  const result = configSchema.safeParse({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    zgPrivateKey: process.env.ZG_PRIVATE_KEY,
    zgEvmRpc: process.env.ZG_EVM_RPC,
    zgIndexerRpc: process.env.ZG_INDEXER_RPC,
    axlHost: process.env.AXL_HOST,
    axlPort: process.env.AXL_PORT,
    axlBinaryPath: process.env.AXL_BINARY_PATH,
    x402WalletPrivateKey: process.env.X402_WALLET_PRIVATE_KEY,
    x402RpcUrl: process.env.X402_RPC_URL,
    ensRpcUrl: process.env.ENS_RPC_URL,
    keeperHubApiKey: process.env.KEEPERHUB_API_KEY,
    keeperHubWebhookSecret: process.env.KEEPERHUB_WEBHOOK_SECRET,
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    sqlitePath: process.env.SQLITE_PATH,
  });

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Config validation failed:\n${errors}`);
  }

  return result.data;
}
