import 'dotenv/config';
import { loadConfig } from './utils/validator.js';
import { logger } from './utils/logger.js';
import { initAXL } from './privacy/axl.js';
import { initLocalMemory } from './memory/local.js';
import { initDecentralizedMemory } from './memory/decentralized.js';

async function main() {
  logger.info('Nexis starting up', { version: '0.1.0' });

  const config = loadConfig();
  logger.info('Config loaded', {
    env: config.nodeEnv,
    port: config.port,
    axlHost: config.axlHost,
    axlPort: config.axlPort,
  });

  // ── Local memory (SQLite) ─────────────────────────────────────────────────
  const local = initLocalMemory(config.sqlitePath);
  const stats = local.getStats();
  logger.info('[Memory:Local] Ready', stats);

  // ── Decentralized memory (0G Storage) ────────────────────────────────────
  const decentralized = initDecentralizedMemory(
    config.zgEvmRpc,
    config.zgIndexerRpc,
    config.zgPrivateKey
  );
  logger.info('[Memory:0G] Ready', { wallet: decentralized.getWalletAddress() });

  // ── AXL privacy layer ─────────────────────────────────────────────────────
  logger.info('[AXL] Initializing privacy layer...');
  const axl = await initAXL({
    host: config.axlHost,
    port: config.axlPort,
    binaryPath: config.axlBinaryPath,
    configPath: './axl-node/config.json',
  });

  logger.info('[AXL] Privacy layer online', {
    publicKey: axl.getPublicKey(),
    ipv6: axl.getIPv6(),
  });

  logger.info('Nexis ready — private autonomous research agent online');
  logger.info('Stack: Gensyn AXL | 0G Storage | x402 | ENS | KeeperHub');

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = () => {
    logger.info('Shutting down...');
    axl.stop();
    local.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
