import 'dotenv/config';
import { initLocalMemory } from '../src/memory/local.js';
import { initDecentralizedMemory } from '../src/memory/decentralized.js';
import { initLLM } from '../src/services/llm.js';
import { initAXL } from '../src/privacy/axl.js';
import { runResearch } from '../src/agent/orchestrator.js';
import { logger } from '../src/utils/logger.js';
import { loadConfig } from '../src/utils/validator.js';

async function main() {
  logger.info('[Test] Booting Nexis for E2E test...');

  const config = loadConfig();

  initLocalMemory(config.sqlitePath);
  initDecentralizedMemory(config.zgEvmRpc, config.zgIndexerRpc, config.zgPrivateKey);
  initLLM();

  await initAXL({
    host: config.axlHost,
    port: config.axlPort,
    binaryPath: config.axlBinaryPath,
    configPath: './axl-node/config.json',
  });

  logger.info('[Test] All systems ready. Running research...');

  const result = await runResearch(
    'test-user-001',
    'Find pain points around crypto trading privacy tools on Reddit',
    { skipStorage: false }
  );

  logger.info('[Test] Done', {
    sessionId: result.sessionId,
    capabilities: result.plan.capabilities_run,
    success: result.results.filter(r => r.success).length,
    total: result.results.length,
    duration_ms: result.duration_ms,
    rootHash: result.storage?.rootHash,
    txHash: result.storage?.txHash,
  });

  console.log('\n' + '='.repeat(60));
  console.log('NEXIS RESEARCH SUMMARY');
  console.log('='.repeat(60));
  console.log(result.summary);
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

main().catch((err) => {
  logger.error('[Test] Fatal error', { error: err.message, stack: err.stack });
  process.exit(1);
});
