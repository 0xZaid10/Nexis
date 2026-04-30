import { getLLM } from '../../services/llm.js';
import { researchTopic } from '../../services/reddit.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Reddit Analysis Capability ───────────────────────────────────────────────
// Ported from agent-src/agents/reddit-analyst.js

const STRICT = '\nRaw JSON only. Start {. End }. No markdown. Strings MAX 15 words.';

export interface RedditAnalysisParams {
  topic: string;
  company: string;
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

async function extractPainPoints(posts: any[], topic: string, company: string): Promise<any> {
  const llm = getLLM();
  return parseJSON(await llm.prompt(`Pain points about "${topic}" for ${company} from ${posts.length} Reddit posts.

POSTS (real scraped data):
${formatPosts(posts)}

JSON:
{
  "pain_points": [{"pain":"","occurrences":0,"total_upvotes":0,"severity":"HIGH/MEDIUM/LOW","confidence":"HIGH/MEDIUM/LOW","evidence_quote":"","evidence_url":"","data_source":"SCRAPED_REDDIT"}],
  "competitor_mentions": [{"name":"","sentiment":"positive/negative/mixed","mention_count":0,"context":""}],
  "feature_requests": []
}${STRICT}`,
    `Reddit analyst. Only extract what posts explicitly say.`,
    { temperature: 0.2 }
  ));
}

async function analyzeSentiment(posts: any[], topic: string): Promise<any> {
  const llm = getLLM();
  const avgScore = posts.reduce((s: number, p: any) => s + p.score, 0) / Math.max(posts.length, 1);
  return parseJSON(await llm.prompt(`Sentiment for "${topic}" from ${posts.length} Reddit posts (avg score: ${Math.round(avgScore)}).

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
    'Sentiment analyst. Base all percentages on actual data.',
    { temperature: 0.2 }
  ));
}

async function synthesizeFindings(
  ranked: any[],
  competitors: Record<string, any>,
  redditData: any,
  topic: string,
  company: string,
  profileCtx: string
): Promise<any> {
  const llm = getLLM();
  return parseJSON(await llm.prompt(`Reddit research for ${company} on "${topic}".
Context: ${profileCtx}
${redditData.total_posts} posts from ${redditData.subreddits.join(', ')}.

TOP PAIN POINTS:
${ranked.slice(0, 6).map((p, i) => `${i + 1}. "${p.pain}" — ${p.frequency} posts, ${p.upvotes_total} upvotes`).join('\n')}

COMPETITORS MENTIONED:
${Object.values(competitors).slice(0, 5).map((c: any) => `${c.name}: ${c.count} mentions, ${c.sentiment}`).join('\n')}

JSON:
{
  "executive_summary": "2 sentences. What the data shows. Include post count.",
  "data_quality_note": "",
  "total_posts_analyzed": ${redditData.total_posts},
  "subreddits_covered": ${JSON.stringify(redditData.subreddits)},
  "top_pain_points": [{"rank":1,"pain":"","severity":"HIGH","frequency":0,"total_upvotes":0,"confidence":"HIGH/MEDIUM/LOW","evidence_quote":"","evidence_url":"","opportunity":"","data_source":"SCRAPED_REDDIT"}],
  "competitor_landscape": [{"competitor":"","mentions":0,"sentiment":"","weakness":""}],
  "what_data_cannot_tell_us": ""
}${STRICT}`,
    `Market researcher for ${company}. Be honest about data limitations.`,
    { temperature: 0.3 }
  ));
}

export async function runRedditAnalysis(params: RedditAnalysisParams): Promise<CapabilityResult> {
  const { topic, company, industry = '', depth = 'standard' } = params;
  const profileCtx = `${company} (${industry})`;
  const postsPerSub = depth === 'deep' ? 100 : 50;
  const mem = getLocalMemory();

  logger.info('[Capability:Reddit] Starting', { company, topic, postsPerSub });

  const redditData = await researchTopic(topic, industry, postsPerSub);

  if (redditData.total_posts === 0) {
    return {
      capability: 'reddit',
      success: false,
      error: 'No Reddit posts found for this topic',
      data: { topic, subreddits_tried: redditData.subreddits },
    };
  }

  logger.info('[Capability:Reddit] Scraped', { posts: redditData.total_posts });

  // Batch process pain points
  const batches = batchPosts(redditData.posts, 15);
  const allPainPoints: any[] = [];

  for (let i = 0; i < batches.length; i += 3) {
    const chunk = batches.slice(i, i + 3);
    const results = await Promise.all(
      chunk.map((batch) => extractPainPoints(batch, topic, company).catch(() => ({
        pain_points: [], competitor_mentions: [], feature_requests: []
      })))
    );
    allPainPoints.push(...results);
    logger.info('[Capability:Reddit] Batch progress', {
      done: Math.min(i + 3, batches.length),
      total: batches.length,
    });
  }

  // Aggregate pain points
  const aggregated: Record<string, any> = {};
  const competitors: Record<string, any> = {};
  const featureRequests: string[] = [];

  for (const batch of allPainPoints) {
    for (const pp of (batch.pain_points || [])) {
      const key = (pp.pain || '').toLowerCase().slice(0, 40);
      if (!key) continue;
      if (!aggregated[key]) aggregated[key] = { ...pp, frequency: 0, upvotes_total: 0 };
      aggregated[key].frequency += 1;
      aggregated[key].upvotes_total += pp.total_upvotes || 0;
    }
    for (const cm of (batch.competitor_mentions || [])) {
      if (!cm.name) continue;
      if (!competitors[cm.name]) competitors[cm.name] = { ...cm, count: 0 };
      competitors[cm.name].count += cm.mention_count || 1;
    }
    featureRequests.push(...(batch.feature_requests || []));
  }

  const ranked = Object.values(aggregated)
    .sort((a, b) => (b.frequency * (b.upvotes_total + 1)) - (a.frequency * (a.upvotes_total + 1)))
    .slice(0, 10);

  const [sentimentData, coreReport] = await Promise.all([
    analyzeSentiment(redditData.top_posts, topic).catch(() => ({
      overall: 'mixed', positive_pct: 33, negative_pct: 33, neutral_pct: 34, confidence: 'LOW'
    })),
    synthesizeFindings(ranked, competitors, redditData, topic, company, profileCtx),
  ]);

  mem.set(`reddit_${topic.replace(/\s+/g, '_').slice(0, 30)}`, {
    topic, company, run_at: new Date().toISOString(),
    summary: (coreReport as any).executive_summary,
    top_pain: (coreReport as any).top_pain_points?.[0]?.pain,
    total_posts: redditData.total_posts,
  });

  logger.info('[Capability:Reddit] Complete', { company, topic, posts: redditData.total_posts });

  return {
    capability: 'reddit',
    success: true,
    data: {
      type: 'reddit_analysis',
      company, topic,
      run_at: new Date().toISOString(),
      stats: {
        total_posts: redditData.total_posts,
        subreddits: redditData.subreddits,
        subreddit_breakdown: redditData.subreddit_breakdown,
      },
      report: coreReport,
      sentiment: sentimentData,
      top_quotes: redditData.top_posts.filter((p: any) => p.score > 5).slice(0, 5).map((p: any) => ({
        quote: p.title, context: (p.text || '').slice(0, 150),
        score: p.score, url: p.url, subreddit: `r/${p.subreddit}`,
      })),
    },
  };
}
