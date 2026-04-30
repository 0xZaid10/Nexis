import { getCapability } from './capabilities/index.js';
import { ContextManager } from './context.js';
import { logger } from '../utils/logger.js';
import type { ExecutionPlan, CapabilityResult } from './types.js';

// ─── Executor ─────────────────────────────────────────────────────────────────
// Runs capabilities in order, passing context between them
// Circuit-breaker style — one failure doesn't stop the whole run

export interface ExecutionResult {
  capability: string;
  order: number;
  success: boolean;
  error?: string;
  data: unknown;
  duration_ms: number;
}

export async function executePlan(
  plan: ExecutionPlan,
  userId: string,
  ctx: ContextManager
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  const resultMap: Record<string, unknown> = {};

  // Sort by order
  const sorted = [...plan.capabilities].sort((a, b) => a.order - b.order);

  for (const cap of sorted) {
    const capability = getCapability(cap.id);

    if (!capability) {
      logger.warn('[Executor] Unknown capability', { id: cap.id });
      results.push({
        capability: cap.id,
        order: cap.order,
        success: false,
        error: `Unknown capability: ${cap.id}`,
        data: null,
        duration_ms: 0,
      });
      continue;
    }

    logger.info('[Executor] Running capability', { capability: cap.id, order: cap.order, userId });

    const start = Date.now();

    try {
      // Inject context from previous results if this depends on something
      const params = { ...cap.params };

      if (cap.depends_on && resultMap[cap.depends_on]) {
        params.researchContext = ctx.getContextSummary();
      }

      // Always inject running context summary so capability has full picture
      params.conversationHistory = ctx.getHistory();
      params.researchContext = ctx.getContextSummary();

      // Run the capability
      const result: CapabilityResult = await capability.runner(params);

      const duration = Date.now() - start;

      // Add result to context so next capability knows what happened
      ctx.addCapabilityResult(cap.id, result.data);
      resultMap[cap.id] = result.data;

      results.push({
        capability: cap.id,
        order: cap.order,
        success: result.success,
        error: result.error,
        data: result.data,
        duration_ms: duration,
      });

      logger.info('[Executor] Capability complete', {
        capability: cap.id,
        success: result.success,
        duration_ms: duration,
      });

    } catch (err) {
      const duration = Date.now() - start;
      const error = (err as Error).message;

      logger.error('[Executor] Capability failed', {
        capability: cap.id,
        error,
        duration_ms: duration,
      });

      results.push({
        capability: cap.id,
        order: cap.order,
        success: false,
        error,
        data: null,
        duration_ms: duration,
      });

      // Don't stop — continue with next capability
    }
  }

  return results;
}
