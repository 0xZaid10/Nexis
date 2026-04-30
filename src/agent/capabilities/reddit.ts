import { getLLM } from '../../services/llm.js';
import { researchTopic } from '../../services/reddit.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Reddit Analysis Capability ───────────────────────────────────────────────
// General-purpose community research capability.
// Works for any topic — crypto, SaaS, AI tools, health tech, developer tools, etc.
// Three quality improvements:
//   1. Frequency gate — single-thread pains marked UNVALIDATED, not ranked top
//   2. Pain score = frequency * log(upvotes + 1) — frequency weighted by resonance
//   3. Signal classifier — structural / product / regulatory / community
//   4. Subreddit bias cap — no single subreddit dominates (max 30%)

const STRICT = '\nRaw JSON only. Start {. End }. No markdown. Strings MAX 15 words.';
const MIN_FREQUENCY_FOR_VALIDATED = 2; // must appear in 2+ posts to be "validated"
const MAX_SUBREDDIT_SHARE = 0.30; // no subreddit can contribute more than 30% of posts

export interface RedditAnalysisParams {
  topic: string;
  company?: string;
  industry?: string;
  depth?: 'standard' | 'deep';
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function parseJSON(raw: string): unknown {
  try {
    const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
    return f !== -1 ? JSON.parse(raw.slice(f, l + 1)) : {};
  } catch { return {}; }
}

function batchPosts<T>(posts: T[], size = 15): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < posts.length; i += size) batches.push(posts.slice(i, i + size));
  return batches;
}

function formatPosts(posts: any[]): string {
  return posts.map((p, i) =>
    `[${i + 1}] r/${p.subreddit} Score:${p.score} | ${p.title} | ${(p.text || '').slice(0, 200)}`
  ).join('\n');
}

// ─── Pain score formula ───────────────────────────────────────────────────────
// frequency * log(upvotes + 1)
// Prevents single loud posts from dominating over quiet recurring problems

function painScore(frequency: number, upvotes: number): number {
  return frequency * Math.log(upvotes + 1);
}

// ─── Subreddit bias cap ───────────────────────────────────────────────────────
// Cap any single subreddit to MAX_SUBREDDIT_SHARE of total posts
// Prevents Monero (or any community) from dominating results

function capSubredditBias(posts: any[], totalTarget: number): any[] {
  const bySubreddit: Record<string, any[]> = {};
  for (const p of posts) {
    if (!bySubreddit[p.subreddit]) bySubreddit[p.subreddit] = [];
    bySubreddit[p.subreddit].push(p);
  }

  const maxPerSub = Math.ceil(totalTarget * MAX_SUBREDDIT_SHARE);
  const capped: any[] = [];

  for (const [sub, subPosts] of Object.entries(bySubreddit)) {
    const allowed = subPosts.slice(0, maxPerSub);
    if (subPosts.length > maxPerSub) {
      logger.info('[Capability:Reddit] Subreddit bias capped', {
        subreddit: sub,
        original: subPosts.length,
        capped: allowed.length,
      });
    }
    capped.push(...allowed);
  }

  return capped;
}

// ─── Extract pain points from batch ──────────────────────────────────────────

async function extractPainPoints(posts: any[], topic: string, context: string): Promise<any> {
  const llm = getLLM();
  return parseJSON(await llm.prompt(`Extract pain points about "${topic}" from these community posts.
Context: ${context}

POSTS (real scraped data):
${formatPosts(posts)}

Classify each pain by type:
- structural: system/architecture level (e.g. KYC, platform limitations, infrastructure)
- product: UX, features, pricing, usability
- regulatory: legal, compliance, policy
- community: governance, drama, community-specific issues

JSON:
{
  "pain_points": [{
    "pain": "max 12 words",
    "type": "structural/product/regulatory/community",
    "occurrences": 0,
    "total_upvotes": 0,
    "severity": "HIGH/MEDIUM/LOW",
    "evidence_quote": "direct quote max 15 words",
    "evidence_url": "",
    "data_source": "SCRAPED_REDDIT"
  }],
  "competitor_mentions": [{"name":"","sentiment":"positive/negative/mixed","mention_count":0}],
  "feature_requests": []
}${STRICT}`,
    `Research analyst. Only extract what posts explicitly say. Classify signal types accurately.`,
    { temperature: 0.2 }
  ));
}

// ─── Sentiment analysis ───────────────────────────────────────────────────────

async function analyzeSentiment(posts: any[], topic: string): Promise<any> {
  const llm = getLLM();
  const avg = posts.reduce((s: number, p: any) => s + p.score, 0) / Math.max(posts.length, 1);
  return parseJSON(await llm.prompt(`Sentiment for "${topic}" from ${posts.length} posts (avg score: ${Math.round(avg)}).

TOP POSTS:
${formatPosts(posts.slice(0, 10))}

JSON:
{
  "overall": "positive/negative/mixed/neutral",
  "positive_pct": 0,
  "negative_pct": 0,
  "neutral_pct": 0,
  "confidence": "HIGH/MEDIUM/LOW",
  "top_positive": "",
  "top_negative": "",
  "cannot_determine": ""
}${STRICT}`,
    'Sentiment analyst. Base all on actual data.',
    { temperature: 0.2 }
  ));
}

// ─── Synthesize findings with signal types and frequency gate ─────────────────

async function synthesizeFindings(
  validated: any[],
  unvalidated: any[],
  byType: Record<string, any[]>,
  competitors: Record<string, any>,
  redditData: any,
  topic: string,
  context: string
): Promise<any> {
  const llm = getLLM();

  const validatedSnippet = validated.slice(0, 5).map((p, i) =>
    `${i + 1}. [${p.type.toUpperCase()}] "${p.pain}" — ${p.frequency} posts, score: ${p.pain_score.toFixed(1)}, ${p.total_upvotes} upvotes`
  ).join('\n') || 'None validated (all frequency=1)';

  const unvalidatedSnippet = unvalidated.slice(0, 3).map(p =>
    `- [UNVALIDATED] "${p.pain}" — 1 post, ${p.total_upvotes} upvotes`
  ).join('\n') || 'None';

  const typeBreakdown = Object.entries(byType).map(([type, items]) =>
    `${type}: ${items.length} pain points`
  ).join(', ');

  return parseJSON(await llm.prompt(`Synthesize research findings for "${topic}".
Context: ${context}
${redditData.total_posts} posts from ${redditData.subreddits.join(', ')}.

VALIDATED PAIN POINTS (frequency ≥ 2):
${validatedSnippet}

UNVALIDATED (single-thread, treat as weak signal):
${unvalidatedSnippet}

SIGNAL TYPE BREAKDOWN: ${typeBreakdown}

JSON:
{
  "executive_summary": "3 sentences. What data shows. Distinguish validated vs unvalidated. Include post count.",
  "data_quality_note": "honest assessment of signal strength",
  "total_posts_analyzed": ${redditData.total_posts},
  "subreddits_covered": ${JSON.stringify(redditData.subreddits)},
  "validated_pain_points": [{
    "rank": 1,
    "pain": "",
    "type": "structural/product/regulatory/community",
    "severity": "HIGH/MEDIUM/LOW",
    "frequency": 0,
    "pain_score": 0,
    "total_upvotes": 0,
    "confidence": "HIGH/MEDIUM/LOW",
    "evidence_quote": "",
    "evidence_url": "",
    "opportunity": "",
    "data_source": "SCRAPED_REDDIT",
    "validation_status": "VALIDATED"
  }],
  "unvalidated_signals": [{
    "pain": "",
    "type": "",
    "total_upvotes": 0,
    "validation_status": "UNVALIDATED",
    "note": "single thread — needs corroboration"
  }],
  "signal_type_summary": {
    "structural": "",
    "product": "",
    "regulatory": "",
    "community": ""
  },
  "competitor_landscape": [{"competitor":"","mentions":0,"sentiment":"","weakness":""}],
  "what_data_cannot_tell_us": ""
}${STRICT}`,
    `Research analyst. Be strict about validated vs unvalidated. Don't conflate signal types.`,
    { temperature: 0.3 }
  ));
}

// ─── Main capability ──────────────────────────────────────────────────────────

export async function runRedditAnalysis(params: RedditAnalysisParams): Promise<CapabilityResult> {
  const { topic, company = 'Research', industry = '', depth = 'standard' } = params;
  const context = company !== 'Research' ? `${company} (${industry})` : `General research on: ${topic}`;
  const postsPerSub = depth === 'deep' ? 100 : 50;
  const mem = getLocalMemory();

  logger.info('[Capability:Reddit] Starting', { topic, depth, postsPerSub });

  const rawRedditData = await researchTopic(topic, industry, postsPerSub);

  // ── Relevance filter ──────────────────────────────────────────────────────
  const topicKeywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const relevantPosts = rawRedditData.posts.filter((p: any) => {
    const text = `${p.title} ${p.text}`.toLowerCase();
    return topicKeywords.some(kw => text.includes(kw));
  });

  logger.info('[Capability:Reddit] Relevance filtered', {
    raw: rawRedditData.total_posts,
    relevant: relevantPosts.length,
  });

  // ── Subreddit bias cap ────────────────────────────────────────────────────
  const balancedPosts = capSubredditBias(relevantPosts, relevantPosts.length);

  const redditData = {
    ...rawRedditData,
    posts: balancedPosts,
    top_posts: balancedPosts.slice(0, 20),
    total_posts: balancedPosts.length,
  };

  if (redditData.total_posts === 0) {
    return {
      capability: 'reddit',
      success: false,
      error: 'No relevant Reddit posts found for this topic',
      data: { topic, subreddits_tried: rawRedditData.subreddits },
    };
  }

  logger.info('[Capability:Reddit] Balanced dataset', { posts: redditData.total_posts });

  // ── Batch extract pain points ─────────────────────────────────────────────
  const batches = batchPosts(redditData.posts, 15);
  const allPainPoints: any[] = [];

  for (let i = 0; i < batches.length; i += 3) {
    const chunk = batches.slice(i, i + 3);
    const results = await Promise.all(
      chunk.map((batch) => extractPainPoints(batch, topic, context).catch(() => ({
        pain_points: [], competitor_mentions: [], feature_requests: []
      })))
    );
    allPainPoints.push(...results);
    logger.info('[Capability:Reddit] Batch progress', {
      done: Math.min(i + 3, batches.length),
      total: batches.length,
    });
  }

  // ── Aggregate with frequency gate ─────────────────────────────────────────
  const aggregated: Record<string, any> = {};
  const competitors: Record<string, any> = {};

  for (const batch of allPainPoints) {
    for (const pp of (batch.pain_points || [])) {
      const key = (pp.pain || '').toLowerCase().slice(0, 50);
      if (!key) continue;
      if (!aggregated[key]) {
        aggregated[key] = { ...pp, frequency: 0, total_upvotes: 0, pain_score: 0 };
      }
      aggregated[key].frequency += 1;
      aggregated[key].total_upvotes += pp.total_upvotes || 0;
      // Pain score = frequency * log(upvotes + 1)
      aggregated[key].pain_score = painScore(
        aggregated[key].frequency,
        aggregated[key].total_upvotes
      );
    }
    for (const cm of (batch.competitor_mentions || [])) {
      if (!cm.name) continue;
      if (!competitors[cm.name]) competitors[cm.name] = { ...cm, count: 0 };
      competitors[cm.name].count += cm.mention_count || 1;
    }
  }

  // ── Split validated vs unvalidated ────────────────────────────────────────
  const allPains = Object.values(aggregated).sort((a, b) => b.pain_score - a.pain_score);

  const validated = allPains
    .filter(p => p.frequency >= MIN_FREQUENCY_FOR_VALIDATED)
    .slice(0, 8);

  const unvalidated = allPains
    .filter(p => p.frequency < MIN_FREQUENCY_FOR_VALIDATED)
    .sort((a, b) => b.total_upvotes - a.total_upvotes)
    .slice(0, 5);

  // ── Group by signal type ──────────────────────────────────────────────────
  const byType: Record<string, any[]> = {
    structural: [], product: [], regulatory: [], community: []
  };
  for (const p of validated) {
    const type = p.type || 'structural';
    if (byType[type]) byType[type].push(p);
    else byType['structural'].push(p);
  }

  logger.info('[Capability:Reddit] Aggregation complete', {
    total_pains: allPains.length,
    validated: validated.length,
    unvalidated: unvalidated.length,
    by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
  });

  // ── Synthesize + sentiment ────────────────────────────────────────────────
  const [sentimentData, coreReport] = await Promise.all([
    analyzeSentiment(redditData.top_posts, topic).catch(() => ({
      overall: 'mixed', positive_pct: 33, negative_pct: 33, neutral_pct: 34, confidence: 'LOW'
    })),
    synthesizeFindings(validated, unvalidated, byType, competitors, redditData, topic, context),
  ]);

  // ── Save to memory ────────────────────────────────────────────────────────
  mem.set(`reddit_${topic.replace(/\s+/g, '_').slice(0, 30)}`, {
    topic, company, run_at: new Date().toISOString(),
    summary: (coreReport as any).executive_summary,
    validated_count: validated.length,
    top_validated_pain: validated[0]?.pain,
    total_posts: redditData.total_posts,
  });

  logger.info('[Capability:Reddit] Complete', {
    topic,
    posts: redditData.total_posts,
    validated_pains: validated.length,
  });

  return {
    capability: 'reddit',
    success: true,
    data: {
      type: 'reddit_analysis',
      topic, company,
      run_at: new Date().toISOString(),
      stats: {
        total_posts: redditData.total_posts,
        subreddits: redditData.subreddits,
        subreddit_breakdown: redditData.subreddit_breakdown,
        validated_pains: validated.length,
        unvalidated_signals: unvalidated.length,
      },
      report: coreReport,
      sentiment: sentimentData,
      top_quotes: redditData.top_posts
        .filter((p: any) => p.score > 5)
        .slice(0, 5)
        .map((p: any) => ({
          quote: p.title,
          context: (p.text || '').slice(0, 150),
          score: p.score,
          url: p.url,
          subreddit: `r/${p.subreddit}`,
        })),
    },
  };
}
