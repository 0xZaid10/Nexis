import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHmac } from 'crypto';
import { runResearch } from '../../agent/orchestrator.js';
import { createError } from '../middleware/error.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// ─── Signature validation ─────────────────────────────────────────────────────

function validateSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true; // dev mode
  try {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    return `sha256=${expected}` === signature;
  } catch { return false; }
}

// ─── Event → research goal mapper ─────────────────────────────────────────────

function mapEventToGoal(event: Record<string, unknown>): { goal: string; userId: string } | null {
  const type = (event.type || event.eventType || '') as string;
  const data = (event.data || event) as Record<string, unknown>;
  const userId = (event.userId || event.user_id || 'keeper-auto') as string;

  // Whale movement
  if (type === 'whale_movement' || type.includes('balance')) {
    const address = (data.address || event.address) as string;
    const threshold = (data.threshold_eth || event.threshold_eth || 100) as number;
    if (address) {
      return {
        goal: `Analyze this Ethereum wallet urgently — it just moved more than ${threshold} ETH: ${address}. Identify wallet type, funding sources, recent activity patterns, and what this movement might signal.`,
        userId,
      };
    }
  }

  // Token surge
  if (type === 'token_surge' || type.includes('price')) {
    const token = (data.tokenAddress || data.token || event.tokenAddress) as string;
    const pct = (data.threshold_percent || event.threshold_percent || 20) as number;
    if (token) {
      return {
        goal: `Token ${token} just moved ${pct}%. Research this token — analyze onchain holder data, recent large transfers, Reddit and community sentiment, and what's driving this price action.`,
        userId,
      };
    }
  }

  // Scheduled research
  if (type === 'scheduled_research' || type.includes('scheduled')) {
    const goal = (data.goal || event.goal) as string;
    if (goal) return { goal, userId };
  }

  // Contract deposit
  if (type.includes('contract') || type.includes('deposit')) {
    const protocol = (data.protocol || data.contractName || 'unknown protocol') as string;
    const amount = (data.amount || data.value || '') as string;
    return {
      goal: `A large deposit of ${amount} was just made to ${protocol}. Research this protocol — analyze onchain activity, community sentiment, and what this deposit signals.`,
      userId,
    };
  }

  // Manual trigger with explicit goal
  if (data.goal || event.goal) {
    return { goal: (data.goal || event.goal) as string, userId };
  }

  return null;
}

// ─── POST /api/keeper/webhook ─────────────────────────────────────────────────

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-keeperhub-signature'] as string || '';
    const secret = process.env.KEEPERHUB_WEBHOOK_SECRET || '';
    const rawBody = JSON.stringify(req.body);

    if (!validateSignature(rawBody, signature, secret)) {
      throw createError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    const event = req.body as Record<string, unknown>;
    logger.info('[Keeper] Webhook received', { type: event.type || event.eventType });

    const mapped = mapEventToGoal(event);

    if (!mapped) {
      logger.warn('[Keeper] Could not map event to research goal', { type: event.type });
      res.json({ success: true, message: 'Event received — no research action mapped' });
      return;
    }

    logger.info('[Keeper] Triggering autonomous research', {
      userId: mapped.userId,
      goal: mapped.goal.slice(0, 100),
    });

    // Fire research in background — respond immediately to KeeperHub
    runResearch(mapped.userId, mapped.goal, { skipStorage: false })
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

    res.json({
      success: true,
      message: 'Nexis research triggered autonomously',
      goal: mapped.goal.slice(0, 100),
      userId: mapped.userId,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/keeper/trigger — manual test trigger ───────────────────────────

router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal, userId = 'keeper-manual', type = 'manual' } = req.body;
    if (!goal) throw createError('goal is required', 400, 'INVALID_GOAL');

    logger.info('[Keeper] Manual trigger', { userId, goal: goal.slice(0, 100) });

    runResearch(userId, goal, { skipStorage: false })
      .then((result) => {
        logger.info('[Keeper] Manual trigger complete', {
          sessionId: result.sessionId,
          duration_ms: result.duration_ms,
          rootHash: result.storage?.rootHash,
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

// ─── POST /api/keeper/create-monitor — create KeeperHub workflow from API ─────

router.post('/create-monitor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, target, threshold, goal, schedule } = req.body;

    const { runKeeperHub } = await import('../../agent/capabilities/keeper.js');

    let result;
    switch (type) {
      case 'whale':
        result = await runKeeperHub({ action: 'create_whale_monitor', target, threshold, telegramChatId: req.body.telegramChatId });
        break;
      case 'token':
        result = await runKeeperHub({ action: 'create_token_monitor', target, threshold });
        break;
      case 'scheduled':
        result = await runKeeperHub({ action: 'create_scheduled', researchGoal: goal, schedule: req.body.schedule });
        break;
      case 'defi':
        result = await runKeeperHub({ action: 'create_defi_monitor', contractAddress: target, goal, network: req.body.network, threshold });
        break;
      case 'generate':
        result = await runKeeperHub({ action: 'generate', goal });
        break;
      default:
        throw createError(`Unknown monitor type: ${type}`, 400, 'INVALID_TYPE');
    }

    res.json({ ...result });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/keeper/workflows — list all Nexis workflows ────────────────────

router.get('/workflows', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { runKeeperHub } = await import('../../agent/capabilities/keeper.js');
    const result = await runKeeperHub({ action: 'list' });
    res.json({ ...result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/keeper/health ───────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'nexis-keeperhub',
    status: 'ready',
    webhook_url: `${process.env.NEXIS_PUBLIC_URL || 'http://localhost:3000'}/api/keeper/webhook`,
    timestamp: new Date().toISOString(),
  });
});

export default router;
