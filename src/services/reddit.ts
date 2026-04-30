import { breakers } from '../utils/circuit-breaker.js';
import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── Reddit Service ───────────────────────────────────────────────────────────
// Ported from agent-src/services/reddit.js
// ALL requests routed through AXL privacy layer

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
  'Accept': 'application/json',
};

// Subreddit map for auto-detection
const SUBREDDIT_MAP: Record<string, string[]> = {
  saas: ['SaaS', 'startups', 'entrepreneur'],
  startup: ['startups', 'entrepreneur', 'SaaS'],
  business: ['smallbusiness', 'entrepreneur', 'startups'],
  developer: ['programming', 'webdev', 'devops'],
  devtools: ['devops', 'programming', 'webdev'],
  ai: ['artificial', 'MachineLearning', 'ChatGPT', 'LocalLLaMA'],
  llm: ['LocalLLaMA', 'MachineLearning', 'artificial'],
  crypto: ['CryptoCurrency', 'defi', 'ethereum', 'bitcoin'],
  defi: ['defi', 'ethereum', 'CryptoCurrency'],
  web3: ['ethereum', 'defi', 'CryptoCurrency', 'solana'],
  trading: ['algotrading', 'CryptoCurrency', 'investing'],
  hr: ['humanresources', 'recruiting', 'jobs'],
  marketing: ['marketing', 'digital_marketing', 'SEO'],
  finance: ['personalfinance', 'investing', 'fintech'],
  productivity: ['productivity', 'projectmanagement', 'getdisciplined'],
};

export function detectSubreddits(topic: string, industry = ''): string[] {
  const combined = `${topic} ${industry}`.toLowerCase();
  const found = new Set<string>();

  for (const [keyword, subs] of Object.entries(SUBREDDIT_MAP)) {
    if (combined.includes(keyword)) {
      subs.forEach((s) => found.add(s));
    }
  }

  // Always include general ones
  found.add('entrepreneur');
  found.add('startups');

  return [...found].slice(0, 6);
}

export interface RedditPost {
  id: string;
  title: string;
  text: string;
  score: number;
  upvote_ratio: number;
  url: string;
  subreddit: string;
  created: string;
  num_comments: number;
  type: 'post';
}

export interface RedditData {
  posts: RedditPost[];
  top_posts: RedditPost[];
  total_posts: number;
  subreddits: string[];
  subreddit_breakdown: Record<string, number>;
}

async function fetchSubredditPosts(
  subreddit: string,
  query: string,
  limit = 50
): Promise<RedditPost[]> {
  const posts: RedditPost[] = [];
  const router = getRouter();

  try {
    let after: string | null = null;
    const perPage = 25;
    const maxPages = Math.ceil(Math.min(limit, 100) / perPage);

    for (let page = 0; page < maxPages; page++) {
      const isSearch = !!query;
      let url: string;

      if (isSearch) {
        url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=relevance&t=year&limit=${perPage}${after ? `&after=${after}` : ''}`;
      } else {
        url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${perPage}${after ? `&after=${after}` : ''}`;
      }

      // ALL requests through AXL privacy router
      const res = await breakers.reddit.call(() => router.get(url, HEADERS));

      const data = (res.data as any)?.data;
      if (!data?.children?.length) break;

      for (const child of data.children) {
        const post = child.data;
        if (post.stickied || post.is_self === false) continue;

        posts.push({
          id: post.id,
          title: post.title || '',
          text: post.selftext || '',
          score: post.score || 0,
          upvote_ratio: post.upvote_ratio || 0.5,
          url: `https://reddit.com${post.permalink}`,
          subreddit: post.subreddit || subreddit,
          created: new Date((post.created_utc || 0) * 1000).toISOString(),
          num_comments: post.num_comments || 0,
          type: 'post',
        });
      }

      after = data.after ?? null;
      if (!after) break;
      await new Promise((r) => setTimeout(r, 500)); // rate limit
    }
  } catch (err) {
    logger.warn('[Reddit] Subreddit fetch failed', {
      subreddit,
      error: (err as Error).message,
    });
  }

  return posts;
}

export async function researchTopic(
  topic: string,
  industry = '',
  postsPerSub = 50
): Promise<RedditData> {
  const subreddits = detectSubreddits(topic, industry);
  logger.info('[Reddit] Researching topic', { topic, subreddits });

  const allPosts: RedditPost[] = [];
  const breakdown: Record<string, number> = {};

  await Promise.all(
    subreddits.map(async (sub) => {
      const posts = await fetchSubredditPosts(sub, topic, postsPerSub).catch(() => []);
      breakdown[sub] = posts.length;
      allPosts.push(...posts);
      logger.info('[Reddit] Subreddit scraped', { sub, count: posts.length });
    })
  );

  // Deduplicate by ID
  const seen = new Set<string>();
  const unique = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const sorted = unique.sort((a, b) => b.score - a.score);

  return {
    posts: sorted,
    top_posts: sorted.slice(0, 20),
    total_posts: sorted.length,
    subreddits,
    subreddit_breakdown: breakdown,
  };
}
