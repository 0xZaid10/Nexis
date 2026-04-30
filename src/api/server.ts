import express from 'express';
import { errorHandler, notFound } from './middleware/error.js';
import researchRoutes from './routes/research.js';
import keeperRoutes from './routes/keeper.js';
import { logger } from '../utils/logger.js';
import { getAXL } from '../privacy/axl.js';
import { getQueueStatus } from '../agent/orchestrator.js';

// ─── Express Server ───────────────────────────────────────────────────────────

export function createServer() {
  const app = express();

  // ── Middleware ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.debug('[API] Request', { method: req.method, path: req.path });
    next();
  });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    const axl = getAXL();
    const queue = getQueueStatus();

    res.json({
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        axl: {
          status: axl.getStatus(),
          publicKey: axl.getPublicKey(),
          ipv6: axl.getIPv6(),
        },
        queue: {
          size: queue.size,
          pending: queue.pending,
          activeJobs: queue.activeJobs.length,
        },
      },
      privacy: {
        routedViaAXL: true,
        encryptedStorage: '0G testnet',
        identityLayer: 'pseudonymous wallet',
      },
    });
  });

  // ── Routes ───────────────────────────────────────────────────────────────
  app.use('/api/research', researchRoutes);
  app.use('/api/keeper', keeperRoutes);

  // ── 404 + Error handlers ─────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export function startServer(port: number): void {
  const app = createServer();

  app.listen(port, () => {
    logger.info('[API] Server started', {
      port,
      endpoints: [
        'POST /api/research/sync — run research and wait for result',
        'POST /api/research — run research in background',
        'GET  /api/research/sessions/:userId — list sessions',
        'GET  /api/research/session/:sessionId — get session',
        'POST /api/research/retrieve — decrypt from 0G',
        'GET  /api/research/queue — queue status',
        'POST /api/keeper/webhook — KeeperHub webhook',
        'POST /api/keeper/trigger — manual trigger',
        'GET  /health — system health',
      ],
    });
  });
}
