import { getLLM } from '../services/llm.js';
import { listCapabilities } from './capabilities/index.js';
import { logger } from '../utils/logger.js';
import type { ExecutionPlan } from './types.js';

// ─── Planner ──────────────────────────────────────────────────────────────────
// Parses a research goal into a structured execution plan
// Uses LLM to determine which capabilities to run and in what order

const STRICT = '\nRaw JSON only. Start {. End }. No markdown.';

export async function planResearch(
  goal: string,
  userId: string,
  contextSummary?: string
): Promise<ExecutionPlan> {
  const llm = getLLM();
  const capList = listCapabilities()
    .map((c) => `- ${c.id}: ${c.description} [keywords: ${c.keywords.slice(0, 4).join(', ')}]`)
    .join('\n');

  const userContext = contextSummary
    ? `\nContext from previous sessions:\n${contextSummary}`
    : '';

  logger.info('[Planner] Planning research', { userId, goal: goal.slice(0, 100) });

  const raw = await llm.prompt(`Parse this research goal into an execution plan.

GOAL: "${goal}"
USER: ${userId}
${userContext}

AVAILABLE CAPABILITIES:
${capList}

Rules:
- Select only capabilities that directly serve this goal
- Max 3 capabilities per plan
- If research feeds content generation, chain them (research first, content second)
- Extract specific params from the goal text
- onchain: needs target (wallet/token address) and type (wallet/token)
- competitive/market: needs company, competitors array
- reddit/blog/twitter/linkedin: needs topic string

JSON:
{
  "task_summary": "what this accomplishes, max 15 words",
  "capabilities": [
    {
      "id": "capability_id",
      "order": 1,
      "name": "human readable name",
      "params": {
        "topic": "extracted topic or null",
        "company": "company name if relevant",
        "competitors": ["list if relevant"],
        "target": "wallet/token address if onchain",
        "type": "wallet/token if onchain",
        "chain": "ethereum/base/arbitrum if onchain",
        "tweets": 12,
        "tone": "if blog post",
        "keyword": "if blog seo"
      },
      "depends_on": null,
      "reason": "why this capability, max 10 words"
    }
  ],
  "estimated_time_seconds": 60,
  "output_type": "research/content/mixed"
}${STRICT}`,
    'Research planner for Nexis private agent. Raw JSON only. Be precise.',
    { temperature: 0.2 }
  );

  try {
    const f = raw.indexOf('{');
    const l = raw.lastIndexOf('}');
    if (f === -1) throw new Error('No JSON found in planner response');

    const plan = JSON.parse(raw.slice(f, l + 1)) as ExecutionPlan;

    if (!plan.capabilities?.length) {
      throw new Error('Planner returned empty capabilities');
    }

    logger.info('[Planner] Plan created', {
      userId,
      summary: plan.task_summary,
      capabilities: plan.capabilities.map((c) => c.id),
      estimated: plan.estimated_time_seconds,
    });

    return plan;
  } catch (err) {
    logger.error('[Planner] Failed to parse plan', { error: (err as Error).message, raw: raw.slice(0, 200) });
    throw new Error(`Planner failed: ${(err as Error).message}`);
  }
}
