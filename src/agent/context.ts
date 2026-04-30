import { logger } from '../utils/logger.js';
import type { ContextMessage, ResearchContext } from './types.js';

// ─── Context Manager ──────────────────────────────────────────────────────────
//
// Solves the stateless LLM problem.
// Every capability result gets appended to a running conversation history.
// Every subsequent LLM call gets the FULL history — zero drift guaranteed.
//
// The agent always knows:
//   - What the original goal was
//   - What has been researched so far
//   - What the previous results showed
//   - What still needs to be done

const MAX_CONTEXT_CHARS = 80_000; // Stay well within 200k token window

export class ContextManager {
  private context: ResearchContext;

  constructor(goal: string) {
    this.context = {
      goal,
      history: [
        {
          role: 'user',
          content: `Research goal: ${goal}\n\nYou are Nexis, a private autonomous research agent. Execute this goal step by step. Never deviate from the original research objective. Build on each result to inform the next step.`,
        },
      ],
      completedCapabilities: [],
      accumulatedResults: {},
    };

    logger.debug('[Context] Initialized', { goal: goal.slice(0, 80) });
  }

  // ─── Add capability result to context ─────────────────────────────────────

  addCapabilityResult(capability: string, result: unknown, summary?: string): void {
    const resultStr = summary || this.summarizeResult(capability, result);

    // Add as assistant message (agent reporting what it found)
    this.context.history.push({
      role: 'assistant',
      content: `[${capability.toUpperCase()} COMPLETE]\n${resultStr}`,
    });

    // Add as user message (system acknowledging and prompting next step)
    this.context.history.push({
      role: 'user',
      content: `Good. ${capability} research complete. Continue with the next step of the research goal: "${this.context.goal}"`,
    });

    this.context.completedCapabilities.push(capability);
    this.context.accumulatedResults[capability] = result;

    // Trim if too long
    this.trimContext();

    logger.debug('[Context] Result added', {
      capability,
      historyLength: this.context.history.length,
    });
  }

  // ─── Get full history for LLM calls ──────────────────────────────────────

  getHistory(): ContextMessage[] {
    return this.context.history;
  }

  // ─── Get context summary string (for capability params) ──────────────────

  getContextSummary(): string {
    const parts: string[] = [`RESEARCH GOAL: ${this.context.goal}`];

    for (const [cap, result] of Object.entries(this.context.accumulatedResults)) {
      parts.push(`\n[${cap.toUpperCase()} RESULTS]:\n${this.summarizeResult(cap, result)}`);
    }

    return parts.join('\n').slice(0, 8000); // Keep reasonable for capability prompts
  }

  // ─── Get goal ─────────────────────────────────────────────────────────────

  getGoal(): string {
    return this.context.goal;
  }

  getCompletedCapabilities(): string[] {
    return this.context.completedCapabilities;
  }

  getAccumulatedResults(): Record<string, unknown> {
    return this.context.accumulatedResults;
  }

  // ─── Summarize result for context injection ───────────────────────────────

  private summarizeResult(capability: string, result: unknown): string {
    if (!result || typeof result !== 'object') return String(result);

    const r = result as any;

    switch (capability) {
      case 'reddit':
        return [
          `Topic: ${r.topic}`,
          `Posts analyzed: ${r.stats?.total_posts}`,
          `Subreddits: ${r.stats?.subreddits?.join(', ')}`,
          `Executive summary: ${r.report?.executive_summary}`,
          `Top pain: ${r.report?.top_pain_points?.[0]?.pain}`,
        ].filter(Boolean).join('\n');

      case 'market':
        return [
          `Topic: ${r.topic}`,
          `Market summary: ${r.executive_summary?.market_summary}`,
          `Biggest opportunity: ${r.executive_summary?.biggest_opportunity}`,
          `Overall confidence: ${r.executive_summary?.overall_confidence}`,
        ].filter(Boolean).join('\n');

      case 'competitive':
        return [
          `Competitors analyzed: ${r.competitors?.length}`,
          `Executive brief: ${r.executive_brief?.tldr}`,
          `One thing: ${r.executive_brief?.one_thing}`,
          `Top threat: ${r.executive_brief?.biggest_threat_right_now?.threat}`,
        ].filter(Boolean).join('\n');

      case 'onchain':
        return [
          `Target: ${r.target} on ${r.chain}`,
          `Analysis: ${r.analysis}`,
        ].filter(Boolean).join('\n');

      case 'blog_post':
      case 'twitter_thread':
      case 'linkedin_post':
        return `Content generated: ${r.title || r.hook || r.topic} (${r.type})`;

      default:
        return JSON.stringify(result).slice(0, 500);
    }
  }

  // ─── Trim context to stay within limits ──────────────────────────────────

  private trimContext(): void {
    const totalChars = this.context.history.reduce((s, m) => s + m.content.length, 0);

    if (totalChars > MAX_CONTEXT_CHARS) {
      // Keep first message (the goal) and last 10 messages
      const first = this.context.history[0];
      const recent = this.context.history.slice(-10);
      this.context.history = [first, ...recent];

      logger.warn('[Context] Trimmed to stay within limits', {
        originalChars: totalChars,
        messages: this.context.history.length,
      });
    }
  }
}
