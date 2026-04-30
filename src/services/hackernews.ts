import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── Hacker News Service ──────────────────────────────────────────────────────
// Algolia HN API — no key needed, high quality signal
// ALL requests routed through AXL privacy layer

const ALGOLIA_URL = 'https://hn.algolia.com/api/v1';

export interface HNItem {
  id: number;
  title: string;
  url: string;
  text: string;
  points: number;
  num_comments: number;
  author: string;
  created_at: string;
  hn_url: string;
  type: 'story' | 'comment';
  engagement: number;
  source: 'hackernews';
}

// ─── Search stories ───────────────────────────────────────────────────────────

export async function searchHN(
  query: string,
  options: {
    type?: 'story' | 'comment' | 'all';
    minPoints?: number;
    maxResults?: number;
    dateRange?: 'pastWeek' | 'pastMonth' | 'pastYear' | 'all';
  } = {}
): Promise<HNItem[]> {
  const router = getRouter();
  const { type = 'story', minPoints = 1, maxResults = 30, dateRange = 'pastYear' } = options;

  const tags = type === 'all' ? 'story,comment' : type;

  const params = new URLSearchParams({
    query,
    tags,
    hitsPerPage: Math.min(maxResults, 50).toString(),
  });

  if (dateRange !== 'all') {
    const now = Math.floor(Date.now() / 1000);
    const ranges: Record<string, number> = {
      pastWeek: 7 * 24 * 3600,
      pastMonth: 30 * 24 * 3600,
      pastYear: 365 * 24 * 3600,
    };
    const since = now - (ranges[dateRange] || ranges.pastYear);
    params.append('numericFilters', `created_at_i>${since}`);
  }

  logger.info('[HackerNews] Searching', { query: query.slice(0, 60) });

  try {
    const res = await router.get(`${ALGOLIA_URL}/search?${params.toString()}`);
    const data = res.data as any;

    if (!data?.hits?.length) return [];

    const items: HNItem[] = data.hits
      .filter((h: any) => (h.points || 0) >= minPoints)
      .map((h: any) => ({
        id: h.objectID,
        title: h.title || h.comment_text?.slice(0, 80) || '',
        url: h.url || '',
        text: (h.story_text || h.comment_text || '').slice(0, 400),
        points: h.points || 0,
        num_comments: h.num_comments || 0,
        author: h.author || '',
        created_at: h.created_at || '',
        hn_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        type: h._tags?.includes('comment') ? 'comment' : 'story',
        engagement: (h.points || 0) + (h.num_comments || 0) * 2,
        source: 'hackernews' as const,
      }));

    items.sort((a, b) => b.engagement - a.engagement);

    logger.info('[HackerNews] Results', { count: items.length });
    return items;

  } catch (err) {
    logger.error('[HackerNews] Search failed', { error: (err as Error).message });
    return [];
  }
}

// ─── Search multiple queries ──────────────────────────────────────────────────

export async function searchHNMultiple(
  queries: string[],
  maxPerQuery = 20
): Promise<HNItem[]> {
  const allItems: HNItem[] = [];
  const seen = new Set<number>();

  for (const query of queries) {
    const items = await searchHN(query, { maxResults: maxPerQuery });
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return allItems.sort((a, b) => b.engagement - a.engagement);
}

// ─── Format for LLM ──────────────────────────────────────────────────────────

export function formatHNItems(items: HNItem[]): string {
  return items.slice(0, 20).map((item, i) =>
    `[${i + 1}] ${item.points}pts 💬${item.num_comments} | ${item.title} | ${item.text.slice(0, 150)}`
  ).join('\n');
}
