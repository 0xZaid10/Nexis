import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── X/Twitter Service ────────────────────────────────────────────────────────
// X API v2 — read-only public tweet search
// ALL requests routed through AXL privacy layer
// Bearer token auth — no user context needed

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';
const BASE_URL = 'https://api.twitter.com/v2';
const MAX_RESULTS = 100;

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  engagement: number; // computed
  source: 'twitter';
}

export interface TwitterSearchResult {
  tweets: Tweet[];
  total: number;
  query: string;
}

function buildHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${BEARER_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// ─── Build search query ───────────────────────────────────────────────────────

function buildQuery(topic: string, options: {
  lang?: string;
  minLikes?: number;
  excludeRetweets?: boolean;
} = {}): string {
  const parts = [topic];

  if (options.excludeRetweets !== false) parts.push('-is:retweet');
  if (options.lang) parts.push(`lang:${options.lang}`);
  if (options.minLikes) parts.push(`min_faves:${options.minLikes}`);

  // Exclude spam/low quality
  parts.push('-is:reply');
  parts.push('has:hashtags');

  return parts.join(' ');
}

// ─── Search tweets ────────────────────────────────────────────────────────────

export async function searchTweets(
  topic: string,
  maxResults = MAX_RESULTS
): Promise<TwitterSearchResult> {
  if (!BEARER_TOKEN) {
    logger.warn('[Twitter] No bearer token configured — skipping');
    return { tweets: [], total: 0, query: topic };
  }

  const router = getRouter();
  const query = buildQuery(topic, { excludeRetweets: true, minLikes: 5 });

  const params = new URLSearchParams({
    query,
    max_results: Math.min(maxResults, 100).toString(),
    'tweet.fields': 'created_at,public_metrics,author_id',
    'sort_order': 'relevancy',
  });

  logger.info('[Twitter] Searching', { topic, query: query.slice(0, 80) });

  try {
    // ALL through AXL privacy router
    const res = await router.get(
      `${BASE_URL}/tweets/search/recent?${params.toString()}`,
      buildHeaders()
    );

    const data = res.data as any;

    if (!data?.data?.length) {
      logger.info('[Twitter] No results', { topic });
      return { tweets: [], total: 0, query };
    }

    const tweets: Tweet[] = data.data.map((t: any) => ({
      id: t.id,
      text: t.text || '',
      author_id: t.author_id || '',
      created_at: t.created_at || '',
      public_metrics: t.public_metrics || {
        retweet_count: 0, like_count: 0, reply_count: 0, quote_count: 0,
      },
      engagement: (t.public_metrics?.like_count || 0) +
        (t.public_metrics?.retweet_count || 0) * 2 +
        (t.public_metrics?.reply_count || 0),
      source: 'twitter' as const,
    }));

    // Sort by engagement
    tweets.sort((a, b) => b.engagement - a.engagement);

    logger.info('[Twitter] Results', { topic, count: tweets.length });
    return { tweets, total: tweets.length, query };

  } catch (err) {
    logger.error('[Twitter] Search failed', { error: (err as Error).message });
    return { tweets: [], total: 0, query };
  }
}

// ─── Search multiple queries ──────────────────────────────────────────────────

export async function searchMultiple(
  queries: string[],
  maxPerQuery = 50
): Promise<Tweet[]> {
  const allTweets: Tweet[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const result = await searchTweets(query, maxPerQuery);
    for (const tweet of result.tweets) {
      if (!seen.has(tweet.id)) {
        seen.add(tweet.id);
        allTweets.push(tweet);
      }
    }
    await new Promise(r => setTimeout(r, 500)); // rate limit
  }

  return allTweets.sort((a, b) => b.engagement - a.engagement);
}

// ─── Format tweets for LLM ───────────────────────────────────────────────────

export function formatTweets(tweets: Tweet[]): string {
  return tweets.slice(0, 30).map((t, i) =>
    `[${i + 1}] Likes:${t.public_metrics.like_count} RT:${t.public_metrics.retweet_count} | ${t.text.slice(0, 200)}`
  ).join('\n');
}
