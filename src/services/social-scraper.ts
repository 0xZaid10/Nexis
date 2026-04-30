import * as cheerio from 'cheerio';
import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── Social Scraper ───────────────────────────────────────────────────────────
// Ported from agent-src/services/social-scraper.js
// ALL requests routed through AXL privacy layer

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const HTML_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
};

export interface ReviewPost {
  id: string;
  title: string;
  text: string;
  score: number;
  comments: number;
  url: string;
  subreddit: string;
  type: string;
}

export interface HNResult {
  title: string;
  url: string;
  points: number;
  comments: number;
  author: string;
  created: string;
  hn_url: string;
  source: 'hackernews';
}

export interface PHResult {
  name: string;
  tagline: string;
  source: 'producthunt';
}

export interface HiringSignal {
  title: string;
  url: string;
  score: number;
  created: string;
}

// ─── Competitor reviews via Reddit ────────────────────────────────────────────

export async function scrapeCompetitorReviews(
  competitor: string,
  limit = 40
): Promise<ReviewPost[]> {
  const router = getRouter();
  const domain = competitor.replace(/\.(com|io|app|co|net|org)$/, '');
  const productName = domain.charAt(0).toUpperCase() + domain.slice(1);

  const queries = [
    `${productName} review`,
    `${productName} complaints problems`,
    `${productName} alternatives`,
  ];

  const allPosts: ReviewPost[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=15`;

      // ALL through AXL privacy router
      const res = await router.get(url, BROWSER_HEADERS);
      const posts = (res.data as any)?.data?.children || [];

      for (const child of posts) {
        const p = child.data;
        if (seen.has(p.id)) continue;
        seen.add(p.id);

        const titleLower = (p.title || '').toLowerCase();
        const domainLower = domain.toLowerCase();
        if (!titleLower.includes(domainLower) && !titleLower.includes(productName.toLowerCase())) continue;

        allPosts.push({
          id: p.id,
          title: p.title || '',
          text: (p.selftext || '').slice(0, 600),
          score: p.score || 0,
          comments: p.num_comments || 0,
          url: `https://reddit.com${p.permalink}`,
          subreddit: p.subreddit || '',
          type: query.includes('complaint') ? 'negative' :
                query.includes('alternative') ? 'switching' : 'general',
        });
      }

      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      logger.warn('[Social] Review search failed', { query, error: (err as Error).message });
    }
  }

  allPosts.sort((a, b) => b.score - a.score);
  logger.info('[Social] Reviews scraped', { competitor, posts: allPosts.length });
  return allPosts.slice(0, limit);
}

// ─── Hacker News (Algolia API) ────────────────────────────────────────────────

export async function searchHackerNews(query: string, limit = 15): Promise<HNResult[]> {
  try {
    const router = getRouter();
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`;

    const res = await router.get(url);
    const hits = (res.data as any)?.hits || [];

    return hits.map((h: any) => ({
      title: h.title || '',
      url: h.url || '',
      points: h.points || 0,
      comments: h.num_comments || 0,
      author: h.author || '',
      created: h.created_at || '',
      hn_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: 'hackernews' as const,
    }));
  } catch (err) {
    logger.warn('[Social] HN search failed', { error: (err as Error).message });
    return [];
  }
}

// ─── Product Hunt ─────────────────────────────────────────────────────────────

export async function scrapeProductHunt(query: string, limit = 10): Promise<PHResult[]> {
  try {
    const router = getRouter();
    const url = `https://www.producthunt.com/search?q=${encodeURIComponent(query)}`;

    const res = await router.get(url, HTML_HEADERS);
    const $ = cheerio.load(res.data as string);
    const products: PHResult[] = [];

    $('[data-test="post-item"], .styles_item__Dk_nz, [class*="item"]').each((_, el) => {
      const name = $(el).find('h3, [data-test="post-name"]').first().text().trim();
      const tagline = $(el).find('p').first().text().trim();
      if (!name || name.length < 2) return;
      products.push({ name: name.slice(0, 80), tagline: tagline.slice(0, 200), source: 'producthunt' });
    });

    logger.info('[Social] Product Hunt scraped', { query, count: products.length });
    return products.slice(0, limit);
  } catch (err) {
    logger.warn('[Social] Product Hunt failed', { error: (err as Error).message });
    return [];
  }
}

// ─── Hiring signals via Reddit ────────────────────────────────────────────────

export async function scrapeHiringSignals(competitor: string, limit = 10): Promise<HiringSignal[]> {
  const domain = competitor.replace(/\.(com|io|app|co|net|org)$/, '');

  try {
    const router = getRouter();
    const query = `${domain} hiring "job posting" OR "we're hiring" OR "team growing"`;
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&t=month&limit=10`;

    const res = await router.get(url, BROWSER_HEADERS);
    const posts = (res.data as any)?.data?.children || [];

    return posts.map((child: any) => ({
      title: child.data.title,
      url: `https://reddit.com${child.data.permalink}`,
      score: child.data.score,
      created: new Date(child.data.created_utc * 1000).toISOString(),
    })).slice(0, limit);
  } catch (err) {
    logger.warn('[Social] Hiring signals failed', { error: (err as Error).message });
    return [];
  }
}
