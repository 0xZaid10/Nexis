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

// ─── Domain detection — mutually exclusive domains ────────────────────────────
// Order matters — more specific domains checked first

interface DomainConfig {
  keywords: string[];
  subreddits: string[];
  defaults: string[]; // always added for this domain
}

const DOMAINS: DomainConfig[] = [
  // Crypto / DeFi / Web3 — checked FIRST (most specific)
  {
    keywords: ['defi', 'crypto', 'blockchain', 'web3', 'ethereum', 'bitcoin', 'solana', 'nft', 'token', 'wallet', 'onchain', 'on-chain', 'privacy coin', 'mixer', 'tornado', 'zk', 'zero knowledge', 'railgun', 'aztec', 'monero', 'zcash', 'privacy protocol', 'dex', 'protocol', 'yield', 'liquidity', 'swap'],
    subreddits: ['CryptoCurrency', 'defi', 'ethereum', 'ethfinance', 'ethdev', 'Monero', 'zksync', 'bitcoin', 'solana'],
    defaults: ['CryptoCurrency', 'defi', 'ethereum'],
  },
  // Trading / algotrading
  {
    keywords: ['trading', 'algotrading', 'strategy', 'alpha', 'signal', 'quant'],
    subreddits: ['algotrading', 'CryptoCurrency', 'investing', 'stocks', 'SecurityAnalysis'],
    defaults: ['algotrading', 'CryptoCurrency'],
  },
  // AI / LLM — ONLY if no crypto keywords present
  {
    keywords: ['llm', 'gpt', 'chatgpt', 'language model', 'machine learning', 'artificial intelligence', 'openai', 'anthropic', 'local llm', 'ollama'],
    subreddits: ['LocalLLaMA', 'MachineLearning', 'artificial', 'ChatGPT', 'singularity'],
    defaults: ['LocalLLaMA', 'MachineLearning'],
  },
  // Automotive / EV
  {
    keywords: ['tesla', 'electric vehicle', 'rivian', 'lucid', 'polestar', 'automotive', 'car complaint', 'ev complaint', 'supercharger', 'range anxiety', 'charging network', 'ford mach', 'ioniq', 'mustang mach'],
    subreddits: ['teslamotors', 'electricvehicles', 'RivianOwners', 'cars', 'teslamodel3', 'teslamodely', 'electriccars', 'TeslaLounge'],
    defaults: ['teslamotors', 'electricvehicles', 'cars'],
  },
  // Productivity tools — search competitor communities, not the tool's own sub
  {
    keywords: ['notion', 'obsidian', 'clickup', 'asana', 'linear', 'jira', 'confluence', 'roam', 'logseq', 'todoist', 'productivity tool', 'note taking', 'project management tool', 'task manager', 'wiki', 'knowledge base', 'workspace'],
    subreddits: ['productivity', 'ObsidianMD', 'projectmanagement', 'Notion', 'NotionSo', 'ClickUp', 'PKMS', 'selfhosted', 'gtd'],
    defaults: ['productivity', 'Notion', 'ObsidianMD'],
  },
  // SaaS / Startup / Business
  {
    keywords: ['saas', 'startup', 'founder', 'product', 'b2b', 'enterprise', 'customer', 'churn', 'mrr', 'arr'],
    subreddits: ['SaaS', 'startups', 'entrepreneur', 'smallbusiness', 'Entrepreneur'],
    defaults: ['SaaS', 'startups'],
  },
  // Developer tools
  {
    keywords: ['developer', 'devtool', 'api', 'sdk', 'open source', 'github', 'coding', 'programming'],
    subreddits: ['programming', 'webdev', 'devops', 'opensource', 'ExperiencedDevs'],
    defaults: ['programming', 'webdev'],
  },
  // Privacy (generic — only if not caught by crypto above)
  {
    keywords: ['privacy', 'surveillance', 'data protection', 'anonymity', 'vpn', 'tracking'],
    subreddits: ['privacy', 'privacytoolsIO', 'netsec', 'selfhosted'],
    defaults: ['privacy'],
  },
  // Marketing / Growth
  {
    keywords: ['marketing', 'growth', 'seo', 'content', 'social media', 'brand'],
    subreddits: ['marketing', 'digital_marketing', 'SEO', 'socialmedia'],
    defaults: ['marketing'],
  },
  // Finance
  {
    keywords: ['finance', 'investing', 'fintech', 'banking', 'stock', 'portfolio'],
    subreddits: ['personalfinance', 'investing', 'fintech', 'stocks'],
    defaults: ['personalfinance', 'investing'],
  },
];

// Fallback if nothing matches
const FALLBACK_SUBREDDITS = ['entrepreneur', 'startups', 'smallbusiness'];

export function detectSubreddits(topic: string, industry = ''): string[] {
  const combined = `${topic} ${industry}`.toLowerCase();
  const found = new Set<string>();
  let matched = false;

  for (const domain of DOMAINS) {
    const domainMatched = domain.keywords.some((kw) => combined.includes(kw));
    if (domainMatched) {
      // Add domain-specific subreddits
      domain.subreddits.forEach((s) => found.add(s));
      matched = true;

      // Once we match crypto domain, don't fall through to AI domain
      // This prevents "DeFi privacy" from pulling AI subreddits
      if (domain === DOMAINS[0]) break; // crypto domain matched — stop here
    }
  }

  if (!matched) {
    FALLBACK_SUBREDDITS.forEach((s) => found.add(s));
  }

  const result = [...found].slice(0, 8);
  logger.debug('[Reddit] Detected subreddits', { topic: topic.slice(0, 60), subreddits: result });
  return result;
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
