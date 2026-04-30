import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

// ─── LLM Service ──────────────────────────────────────────────────────────────
//
// Wrapper around Anthropic SDK pointing at TokenRouter.
// Supports streaming responses for long research summaries.
// All calls go through TokenRouter — no direct Anthropic dependency.

const MODEL = process.env.LLM_MODEL ?? 'anthropic/claude-opus-4-7';
const BASE_URL = process.env.ANTHROPIC_BASE_URL ?? 'https://tokenrouter.ai/v1';
const MAX_TOKENS = 8096;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  text: string;
  done: boolean;
}

export class LLMService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: BASE_URL,
    });

    logger.info('[LLM] Service initialized', {
      model: MODEL,
      baseUrl: BASE_URL,
    });
  }

  // ─── Complete (non-streaming) ─────────────────────────────────────────────

  async complete(messages: Message[], options: LLMOptions = {}): Promise<string> {
    const { maxTokens = MAX_TOKENS, temperature = 0.7, systemPrompt } = options;

    logger.debug('[LLM] Completing request', { model: MODEL, messages: messages.length });

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    logger.debug('[LLM] Completion done', {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return text;
  }

  // ─── Stream ───────────────────────────────────────────────────────────────

  async *stream(messages: Message[], options: LLMOptions = {}): AsyncGenerator<StreamChunk> {
    const { maxTokens = MAX_TOKENS, temperature = 0.7, systemPrompt } = options;

    logger.debug('[LLM] Starting stream', { model: MODEL, messages: messages.length });

    const stream = await this.client.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { text: event.delta.text, done: false };
      }
    }

    const final = await stream.finalMessage();
    logger.debug('[LLM] Stream complete', {
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
    });

    yield { text: '', done: true };
  }

  // ─── Stream to string ─────────────────────────────────────────────────────

  async streamToString(
    messages: Message[],
    options: LLMOptions = {},
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    let full = '';
    for await (const chunk of this.stream(messages, options)) {
      if (!chunk.done) {
        full += chunk.text;
        onChunk?.(chunk.text);
      }
    }
    return full;
  }

  // ─── Convenience: single prompt ───────────────────────────────────────────

  async prompt(userMessage: string, systemPrompt?: string, options: LLMOptions = {}): Promise<string> {
    return this.streamToString(
      [{ role: 'user', content: userMessage }],
      { ...options, systemPrompt }
    );
  }

  // ─── Plan research task ───────────────────────────────────────────────────

  async planResearch(goal: string, context?: string): Promise<string> {
    const system = `You are Nexis, a private autonomous research agent.
Analyze the research goal and produce a structured execution plan.
Return ONLY valid JSON — no markdown, no explanation.

JSON structure:
{
  "taskSummary": "brief description",
  "capabilities": [
    {
      "id": "unique-id",
      "order": 1,
      "name": "capability name",
      "params": {},
      "reason": "why this is needed"
    }
  ],
  "estimatedTimeSeconds": 60,
  "outputType": "research"
}

Available capabilities: onchain, market, competitive, reddit, content`;

    const userMessage = context
      ? `Research goal: ${goal}\n\nContext from previous sessions:\n${context}`
      : `Research goal: ${goal}`;

    return this.prompt(userMessage, system, { temperature: 0.3 });
  }

  // ─── Summarize results ────────────────────────────────────────────────────

  async summarize(goal: string, results: unknown): Promise<string> {
    const system = `You are Nexis, a private autonomous research and intelligence agent.
Synthesize research results into a clear structured intelligence report.
Be specific, cite data points, and provide actionable insights.
Format with clear sections: Summary, Key Findings, Risks, Recommendations.`;

    const userMessage = `Research goal: ${goal}\n\nRaw results:\n${JSON.stringify(results, null, 2)}\n\nGenerate a comprehensive intelligence report.`;

    return this.streamToString(
      [{ role: 'user', content: userMessage }],
      { systemPrompt: system, temperature: 0.5 }
    );
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _llm: LLMService | null = null;

export function getLLM(): LLMService {
  if (!_llm) throw new Error('[LLM] Not initialized — call initLLM() first');
  return _llm;
}

export function initLLM(): LLMService {
  _llm = new LLMService();
  return _llm;
}
