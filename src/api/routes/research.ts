import { Router, type Request, type Response, type NextFunction } from 'express';
import { runResearch, getQueueStatus } from '../../agent/orchestrator.js';
import { getLocalMemory } from '../../memory/local.js';
import { getDecentralizedMemory } from '../../memory/decentralized.js';
import { createError } from '../middleware/error.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// ─── POST /api/research ───────────────────────────────────────────────────────
// Trigger a new research run

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal, userId, skipStorage } = req.body;

    if (!goal || typeof goal !== 'string' || goal.trim().length < 10) {
      throw createError('goal is required and must be at least 10 characters', 400, 'INVALID_GOAL');
    }

    if (!userId || typeof userId !== 'string') {
      throw createError('userId is required', 400, 'INVALID_USER');
    }

    logger.info('[API] Research request received', {
      userId,
      goal: goal.slice(0, 100),
    });

    // Fire research run — this is async and takes 1-3 minutes
    // We return immediately with sessionId so client can poll
    const sessionId = `${userId}-${Date.now()}`;

    // Run in background — don't await
    runResearch(userId, goal.trim(), { skipStorage: skipStorage ?? false })
      .then((result) => {
        logger.info('[API] Background research complete', {
          sessionId: result.sessionId,
          userId,
          duration_ms: result.duration_ms,
        });
      })
      .catch((err) => {
        logger.error('[API] Background research failed', {
          userId,
          error: err.message,
        });
      });

    res.status(202).json({
      success: true,
      message: 'Research started',
      userId,
      goal: goal.trim(),
      status: 'running',
      poll_url: `/api/research/sessions/${userId}`,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/research/sync ──────────────────────────────────────────────────
// Trigger research and wait for result (for testing/demo)

router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal, userId, skipStorage } = req.body;

    if (!goal || typeof goal !== 'string' || goal.trim().length < 10) {
      throw createError('goal is required and must be at least 10 characters', 400, 'INVALID_GOAL');
    }

    if (!userId || typeof userId !== 'string') {
      throw createError('userId is required', 400, 'INVALID_USER');
    }

    logger.info('[API] Sync research request', { userId, goal: goal.slice(0, 100) });

    const result = await runResearch(userId, goal.trim(), {
      skipStorage: skipStorage ?? false,
    });

    res.json({
      success: true,
      ...result,
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/research/sessions/:userId ───────────────────────────────────────
// Get all sessions for a user

router.get('/sessions/:userId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const local = getLocalMemory();
    const sessions = local.getSessionsByUser(userId, 20);

    res.json({
      success: true,
      userId,
      sessions: sessions.map((s) => ({
        id: s.id,
        goal: s.goal,
        status: s.status,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
        summary: s.summary,
        rootHash: s.rootHash,
        txHash: s.txHash,
        hasDecentralizedStorage: !!s.rootHash,
      })),
      total: sessions.length,
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/research/session/:sessionId ─────────────────────────────────────
// Get a specific session

router.get('/session/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const local = getLocalMemory();
    const session = local.getSession(sessionId);

    if (!session) {
      throw createError(`Session not found: ${sessionId}`, 404, 'SESSION_NOT_FOUND');
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        userId: session.userId,
        goal: session.goal,
        status: session.status,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        summary: session.summary,
        rootHash: session.rootHash,
        txHash: session.txHash,
        hasDecentralizedStorage: !!session.rootHash,
        // Don't expose encryptionKey via API — stays local only
      },
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/research/retrieve ─────────────────────────────────────────────
// Retrieve and decrypt a session from 0G

router.post('/retrieve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw createError('sessionId is required', 400, 'INVALID_SESSION');
    }

    const local = getLocalMemory();
    const session = local.getSession(sessionId);

    if (!session) {
      throw createError(`Session not found: ${sessionId}`, 404, 'SESSION_NOT_FOUND');
    }

    if (!session.rootHash || !session.encryptionKey) {
      throw createError('Session has no decentralized storage', 400, 'NO_STORAGE');
    }

    const decentralized = getDecentralizedMemory();
    const result = await decentralized.retrieve(session.rootHash, session.encryptionKey);

    res.json({
      success: true,
      sessionId,
      rootHash: session.rootHash,
      source: result.source,
      data: result.data,
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/research/queue ──────────────────────────────────────────────────
// Queue status

router.get('/queue', (_req: Request, res: Response) => {
  const status = getQueueStatus();
  res.json({ success: true, queue: status });
});

export default router;
