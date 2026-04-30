import * as cheerio from 'cheerio';
import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── Web Search Service ───────────────────────────────────────────────────────
// Primary: SearchAPI (Google results) — https://www.searchapi.io
// Fallback: DuckDuckGo HTML scraping
// ALL requests routed through AXL privacy layer

const SEARCH_API_KEY = process.env.SEARCH_API_KEY || '';
const SEARCH_API_URL = 'https://www.searchapi.io/api/v1/search';

const DDG_URL = 'https://html.duckduckgo.com/html/';
const HEADERS_BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
};

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  source: 'searchapi' | 'duckduckgo' | 'scraped';
  position?: number;
}

// ─── SearchAPI (Google) ───────────────────────────────────────────────────────

async function searchAPISearch(query: string, count = 10): Promise<WebResult[]> {
  const router = getRouter();

  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    num: Math.min(count, 10).toString(),
    api_key: SEARCH_API_KEY,
  });

  logger.info('[WebSearch] SearchAPI query', { query: query.slice(0, 80) });

  try {
    const res = await router.get(
      `${SEARCH_API_URL}?${params.toString()}`
    );

    const data = res.data as any;
    const results = data?.organic_results || [];

    return results.map((r: any, i: number) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
      source: 'searchapi' as const,
      position: r.position || i + 1,
    }));

  } catch (err) {
    logger.warn('[WebSearch] SearchAPI failed', { error: (err as Error).message });
    return [];
  }
}

// ─── Google News via SearchAPI ────────────────────────────────────────────────

export async function searchNews(query: string, count = 10): Promise<WebResult[]> {
  if (!SEARCH_API_KEY) return [];

  const router = getRouter();
  const params = new URLSearchParams({
    engine: 'google_news',
    q: query,
    num: Math.min(count, 10).toString(),
    api_key: SEARCH_API_KEY,
  });

  try {
    const res = await router.get(`${SEARCH_API_URL}?${params.toString()}`);
    const data = res.data as any;
    const results = data?.news_results || [];

    return results.map((r: any) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || r.source || '',
      source: 'searchapi' as const,
    }));
  } catch (err) {
    logger.warn('[WebSearch] News search failed', { error: (err as Error).message });
    return [];
  }
}

// ─── DuckDuckGo fallback ──────────────────────────────────────────────────────

async function duckduckgoSearch(query: string, count = 10): Promise<WebResult[]> {
  const router = getRouter();

  try {
    const res = await router.post(
      DDG_URL,
      `q=${encodeURIComponent(query)}&b=&kl=us-en`,
      { ...HEADERS_BROWSER, 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    const html = res.data as string;
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: WebResult[] = [];

    $('.result__body').each((_, el) => {
      const title = $(el).find('.result__title').text().trim();
      const url = $(el).find('.result__url').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      if (title && snippet) {
        results.push({ title, url: url || '', snippet, source: 'duckduckgo' });
      }
    });

    return results.slice(0, count);

  } catch (err) {
    logger.warn('[WebSearch] DuckDuckGo failed', { error: (err as Error).message });
    return [];
  }
}

// ─── Main search — SearchAPI first, DDG fallback ──────────────────────────────

export async function webSearch(query: string, count = 10): Promise<WebResult[]> {
  logger.info('[WebSearch] Searching', { query: query.slice(0, 80) });

  const results = SEARCH_API_KEY
    ? await searchAPISearch(query, count)
    : await duckduckgoSearch(query, count);

  logger.info('[WebSearch] Results', { count: results.length });
  return results;
}

// ─── Multi-query search ───────────────────────────────────────────────────────

export async function multiSearch(queries: string[], countPerQuery = 5): Promise<WebResult[]> {
  const allResults: WebResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const results = await webSearch(query, countPerQuery);
    for (const r of results) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        allResults.push(r);
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return allResults;
}

// ─── Fetch and extract page content ──────────────────────────────────────────

export async function fetchPageContent(url: string): Promise<string> {
  const router = getRouter();

  try {
    const res = await router.get(url, HEADERS_BROWSER);
    const html = res.data as string;
    if (!html) return '';

    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside').remove();

    return $('article, main, .content, .post, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
  } catch {
    return '';
  }
}

// ─── Format for LLM ──────────────────────────────────────────────────────────

export function formatWebResults(results: WebResult[]): string {
  return results.map((r, i) =>
    `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`
  ).join('\n\n');
}
