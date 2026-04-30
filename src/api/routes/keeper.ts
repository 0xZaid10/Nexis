import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHmac } from 'crypto';
import { runResearch } from '../../agent/orchestrator.js';
import { createError } from '../middleware/error.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// ─── KeeperHub Webhook Handler ────────────────────────────────────────────────
//
// KeeperHub detects onchain events and fires this endpoint.
// We validate the signature, map the event to a research goal,
// and trigger the Nexis agent autonomously.
//
// Flow:
//   KeeperHub detects event (e.g. large wallet accumulation)
//     → POST /api/keeper/webhook
//     → Nexis validates signature
//     → Maps event to research goal
//     → Runs research autonomously
//     → Results encrypted to 0G

// ─── Signature validation ─────────────────────────────────────────────────────

function validateKeeperSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    logger.warn('[Keeper] No webhook secret configured — skipping validation');
    return true; // Allow in dev mode
  }

  try {
    const expected = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return `sha256=${expected}` === signature;
  } catch {
    return false;
  }
}

// ─── Event to research goal mapper ───────────────────────────────────────────

function mapEventToGoal(event: Record<string, unknown>): string | null {
  const eventType = (event.type || event.eventType || event.trigger_type || '') as string;
  const data = (event.data || event.payload || event) as Record<string, unknown>;

  // Large wallet accumulation → research that wallet
  if (eventType.includes('balance') || eventType.includes('transfer')) {
    const address = data.address || data.wallet || data.from || data.to;
    if (address) {
      return `Analyze onchain activity for wallet ${address} — identify patterns, token holdings, and recent transaction behavior`;
    }
  }

  // Token price movement → research that token
  if (eventType.includes('price') || eventType.includes('token')) {
    const token = data.token || data.tokenAddress || data.symbol;
    if (token) {
      return `Research token ${token} — analyze price action, community sentiment on Reddit, and competitive landscape`;
    }
  }

  // Contract event → research the protocol
  if (eventType.includes('contract') || eventType.includes('protocol')) {
    const protocol = data.protocol || data.contractName || data.name;
    if (protocol) {
      return `Research ${protocol} protocol — analyze Reddit sentiment, competitor activity, and market position`;
    }
  }

  // Scheduled research trigger (KeeperHub cron-style)
  if (eventType.includes('scheduled') || eventType.includes('cron') || eventType.includes('time')) {
    const goal = data.goal || data.research_goal || data.query;
    if (goal) return goal as string;
  }

  // Generic fallback — use raw event data as context
  return `Analyze recent onchain activity and market trends based on: ${JSON.stringify(data).slice(0, 200)}`;
}

// ─── POST /api/keeper/webhook ─────────────────────────────────────────────────

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-keeperhub-signature'] as string || '';
    const secret = process.env.KEEPERHUB_WEBHOOK_SECRET || '';
    const rawBody = JSON.stringify(req.body);

    // Validate signature
    if (!validateKeeperSignature(rawBody, signature, secret)) {
      throw createError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    const event = req.body as Record<string, unknown>;
    const userId = (event.userId || event.user_id || 'keeper-auto') as string;

    logger.info('[Keeper] Webhook received', {
      type: event.type || event.eventType,
      userId,
    });

    // Map event to research goal
    const goal = mapEventToGoal(event);

    if (!goal) {
      logger.warn('[Keeper] Could not map event to research goal', { event });
      res.json({
        success: true,
        message: 'Event received but no research action taken',
        event_type: event.type,
      });
      return;
    }

    logger.info('[Keeper] Triggering autonomous research', {
      userId,
      goal: goal.slice(0, 100),
    });

    // Fire research run in background — respond immediately to KeeperHub
    runResearch(userId, goal, { skipStorage: false })
      .then((result) => {
        logger.info('[Keeper] Autonomous research complete', {
          sessionId: result.sessionId,
          duration_ms: result.duration_ms,
          rootHash: result.storage?.rootHash,
        });
      })
      .catch((err) => {
        logger.error('[Keeper] Autonomous research failed', { error: err.message });
      });

    // Respond immediately — KeeperHub expects fast response
    res.json({
      success: true,
      message: 'Research triggered autonomously',
      goal: goal.slice(0, 100),
      userId,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/keeper/trigger ─────────────────────────────────────────────────
// Manual trigger for testing KeeperHub flow

router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal, userId = 'keeper-manual' } = req.body;

    if (!goal) {
      throw createError('goal is required', 400, 'INVALID_GOAL');
    }

    logger.info('[Keeper] Manual trigger', { userId, goal: goal.slice(0, 100) });

    runResearch(userId, goal, { skipStorage: false })
      .then((result) => {
        logger.info('[Keeper] Manual trigger research complete', {
          sessionId: result.sessionId,
          duration_ms: result.duration_ms,
        });
      })
      .catch((err) => {
        logger.error('[Keeper] Manual trigger failed', { error: err.message });
      });

    res.json({
      success: true,
      message: 'Research triggered',
      goal: goal.slice(0, 100),
      userId,
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/keeper/health ───────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'nexis-keeperhub-webhook',
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

export default router;
