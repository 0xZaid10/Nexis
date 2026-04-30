import 'dotenv/config';
import { loadConfig } from './utils/validator.js';
import { logger } from './utils/logger.js';
import { initAXL } from './privacy/axl.js';
import { initLocalMemory } from './memory/local.js';
import { initDecentralizedMemory } from './memory/decentralized.js';
import { initLLM, getLLM } from './services/llm.js';

async function main() {
  logger.info('Nexis starting up', { version: '0.1.0' });

  const config = loadConfig();
  logger.info('Config loaded', {
    env: config.nodeEnv,
    port: config.port,
    axlHost: config.axlHost,
    axlPort: config.axlPort,
  });

  // ── Local memory ──────────────────────────────────────────────────────────
  const local = initLocalMemory(config.sqlitePath);
  logger.info('[Memory:Local] Ready', local.getStats());

  // ── Decentralized memory ──────────────────────────────────────────────────
  const decentralized = initDecentralizedMemory(
    config.zgEvmRpc,
    config.zgIndexerRpc,
    config.zgPrivateKey
  );
  logger.info('[Memory:0G] Ready', { wallet: decentralized.getWalletAddress() });

  // ── LLM ───────────────────────────────────────────────────────────────────
  const llm = initLLM();

  // Quick smoke test
  logger.info('[LLM] Running smoke test...');
  const response = await llm.prompt(
    'Reply with exactly: Nexis LLM online',
    'You are a test assistant. Reply with exactly what is asked.',
    { maxTokens: 20, temperature: 0 }
  );
  logger.info('[LLM] Smoke test passed', { response: response.trim() });

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
