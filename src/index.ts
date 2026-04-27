import 'dotenv/config';
import { loadConfig } from './utils/validator.js';
import { logger } from './utils/logger.js';
import { initAXL } from './privacy/axl.js';

async function main() {
  logger.info('Nexis starting up', { version: '0.1.0' });

  const config = loadConfig();
  logger.info('Config loaded', {
    env: config.nodeEnv,
    port: config.port,
    axlHost: config.axlHost,
    axlPort: config.axlPort,
  });

  // ── Initialize AXL privacy layer ──────────────────────────────────────────
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
  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    axl.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down...');
    axl.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
