import { getLLM } from '../services/llm.js';
import { planResearch } from './planner.js';
import { executePlan } from './executor.js';
import { ContextManager } from './context.js';
import { getLocalMemory } from '../memory/local.js';
import { getDecentralizedMemory } from '../memory/decentralized.js';
import { enqueue, getQueueStatus } from '../utils/queue.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import type { ExecutionPlan } from './types.js';

// ─── Nexis Orchestrator ───────────────────────────────────────────────────────
//
// Top-level coordinator for all research runs.
//
// Flow:
//   1. Load user context from memory (previous sessions)
//   2. Initialize ContextManager (no drift across LLM calls)
//   3. Plan: goal → execution plan via LLM
//   4. Execute: run capabilities in order, building context
//   5. Summarize: LLM generates unified intelligence report
//   6. Persist: save session locally + encrypt + store on 0G
//   7. Return structured result

export interface OrchestratorOptions {
  skipStorage?: boolean; // skip 0G storage (for testing)
}

export interface OrchestratorResult {
  sessionId: string;
  userId: string;
  goal: string;
  run_at: string;
  plan: {
    task_summary: string;
    output_type: string;
    capabilities_run: string[];
  };
  summary: string;
  results: Array<{
    capability: string;
    success: boolean;
    error?: string;
    data: unknown;
    duration_ms: number;
  }>;
  storage?: {
    rootHash: string;
    txHash: string;
    encrypted: boolean;
  };
  routedViaAXL: boolean;
  duration_ms: number;
}

export async function runResearch(
  userId: string,
  goal: string,
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  return enqueue(userId, () => _runResearch(userId, goal, options));
}

async function _runResearch(
  userId: string,
  goal: string,
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const sessionId = uuidv4();
  const startTime = Date.now();
  const llm = getLLM();
  const local = getLocalMemory();

  logger.info('[Orchestrator] Research started', { sessionId, userId, goal: goal.slice(0, 100) });

  // ── 1. Create session in local memory ────────────────────────────────────
  local.createSession({
    id: sessionId,
    userId,
    goal,
    status: 'running',
    createdAt: new Date().toISOString(),
  });

  // ── 2. Load previous context ──────────────────────────────────────────────
  const previousSessions = local.getCompletedSessions(userId, 3);
  const previousContext = previousSessions.length
    ? `Previous research sessions:\n${previousSessions.map(s => `- ${s.goal}: ${s.summary?.slice(0, 100)}`).join('\n')}`
    : undefined;

  // ── 3. Initialize context manager (anti-drift) ────────────────────────────
  const ctx = new ContextManager(goal);

  // ── 4. Plan ──────────────────────────────────────────────────────────────
  let plan: ExecutionPlan;
  try {
    plan = await planResearch(goal, userId, previousContext);
  } catch (err) {
    local.updateSession(sessionId, { status: 'failed', completedAt: new Date().toISOString() });
    throw err;
  }

  if (!plan.capabilities?.length) {
    local.updateSession(sessionId, { status: 'failed', completedAt: new Date().toISOString() });
    return {
      sessionId, userId, goal,
      run_at: new Date().toISOString(),
      plan: { task_summary: 'Could not determine plan', output_type: 'research', capabilities_run: [] },
      summary: 'Could not determine what to do. Please be more specific.',
      results: [],
      routedViaAXL: true,
      duration_ms: Date.now() - startTime,
    };
  }

  // ── 5. Execute ───────────────────────────────────────────────────────────
  const executionResults = await executePlan(plan, userId, ctx);

  // ── 6. Summarize with full context ───────────────────────────────────────
  logger.info('[Orchestrator] Generating summary', { sessionId });

  const resultSnippets = executionResults.map((r) => {
    if (!r.success) return `${r.capability}: FAILED — ${r.error}`;
    return ctx.getContextSummary();
  }).join('\n\n');

  const summary = await llm.streamToString(
    [
      ...ctx.getHistory(),
      {
        role: 'user',
        content: `All research complete. Generate a comprehensive intelligence report.

ORIGINAL GOAL: "${goal}"

RESEARCH RESULTS:
${resultSnippets}

Write a structured report with:
1. Executive Summary (3-5 sentences)
2. Key Findings (bullet points with data sources)
3. Risks & Uncertainties
4. Recommended Actions

Be specific. Reference actual data points. Note confidence levels.`,
      },
    ],
    {
      systemPrompt: 'You are Nexis, a private autonomous research agent. Generate precise, actionable intelligence reports.',
      temperature: 0.4,
    }
  );

  // ── 7. Persist locally ───────────────────────────────────────────────────
  local.updateSession(sessionId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    results: executionResults,
    summary: summary.slice(0, 500),
  });

  // ── 8. Encrypt + store on 0G (async, non-blocking) ───────────────────────
  let storageInfo: OrchestratorResult['storage'] | undefined;

  if (!options.skipStorage) {
    try {
      const decentralized = getDecentralizedMemory();
      const sessionData = {
        sessionId, userId, goal,
        plan, results: executionResults,
        summary, run_at: new Date().toISOString(),
      };

      const storageResult = await decentralized.store(sessionData);

      // Save root hash + encryption key locally (key never leaves local storage)
      local.updateSession(sessionId, {
        rootHash: storageResult.rootHash,
        encryptionKey: storageResult.encryptionKey,
        txHash: storageResult.txHash,
      });

      storageInfo = {
        rootHash: storageResult.rootHash,
        txHash: storageResult.txHash,
        encrypted: true,
      };

      logger.info('[Orchestrator] Session stored on 0G', {
        sessionId,
        rootHash: storageResult.rootHash,
      });
    } catch (err) {
      logger.error('[Orchestrator] 0G storage failed (non-fatal)', {
        error: (err as Error).message,
      });
    }
  }

  const duration = Date.now() - startTime;

  logger.info('[Orchestrator] Research complete', {
    sessionId, userId,
    capabilities: executionResults.length,
    success: executionResults.filter((r) => r.success).length,
    duration_ms: duration,
  });

  return {
    sessionId,
    userId,
    goal,
    run_at: new Date().toISOString(),
    plan: {
      task_summary: plan.task_summary,
      output_type: plan.output_type,
      capabilities_run: plan.capabilities.map((c) => c.id),
    },
    summary,
    results: executionResults.map((r) => ({
      capability: r.capability,
      success: r.success,
      error: r.error,
      data: r.data,
      duration_ms: r.duration_ms,
    })),
    storage: storageInfo,
    routedViaAXL: true,
    duration_ms: duration,
  };
}

export { getQueueStatus };
