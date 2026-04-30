import PQueue from 'p-queue';
import { logger } from './logger.js';

// ─── Task Queue ───────────────────────────────────────────────────────────────
// Ported from agent-src/utils/queue.js
// Max 2 concurrent research runs — scraping + LLM is heavy

const queue = new PQueue({ concurrency: 2, timeout: 300_000 });

const activeJobs = new Map<string, { started_at: string }>();

queue.on('active', () => {
  logger.info('[Queue] Active', { size: queue.size, pending: queue.pending });
});

queue.on('error', (err: Error) => {
  logger.error('[Queue] Error', { error: err.message });
});

export async function enqueue<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  if (activeJobs.has(userId)) {
    throw new Error(`Research run already in progress for ${userId}. Please wait.`);
  }

  activeJobs.set(userId, { started_at: new Date().toISOString() });

  try {
    const result = await queue.add(fn, { priority: 1 });
    return result as T;
  } finally {
    activeJobs.delete(userId);
  }
}

export function getQueueStatus() {
  return {
    size: queue.size,
    pending: queue.pending,
    activeJobs: Array.from(activeJobs.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    })),
  };
}
