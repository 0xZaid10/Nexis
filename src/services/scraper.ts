import * as cheerio from 'cheerio';
import { breakers } from '../utils/circuit-breaker.js';
import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── Scraper Service ──────────────────────────────────────────────────────────
// Ported from agent-src/services/scraper.js
// ALL fetches go through PrivacyRouter — no direct HTTP calls

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      logger.warn('[Scraper] Retry', { attempt, error: (err as Error).message });
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
  throw new Error('All retries exhausted');
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    return await breakers.scraper.call(async () => {
      return withRetry(async () => {
        logger.info('[Scraper] Fetching', { url });

        // ALL requests routed through AXL privacy layer
        const router = getRouter();
        const res = await router.get(url, HEADERS);

        if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
        return res.data as string;
      });
    });
  } catch (err) {
    logger.error('[Scraper] Failed', { url, error: (err as Error).message });
    return null;
  }
}

function extractText(html: string | null, selector = 'body'): string {
  if (!html) return '';
  const $ = cheerio.load(html);
  $('script, style, nav, footer, head').remove();
  return $(selector).text().replace(/\s+/g, ' ').trim().slice(0, 8000);
}

function extractBlogTitles(html: string | null): string[] {
  if (!html) return [];
  const $ = cheerio.load(html);
  const titles: string[] = [];
  $('h2, h3, article h1, .post-title, .blog-title').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 10) titles.push(t);
  });
  return titles.slice(0, 10);
}

export interface ScrapedCompetitor {
  domain: string;
  scraped_at: string;
  pricing?: { url: string; text: string };
  homepage?: { url: string; text: string };
  blog?: { url: string; titles: string[] };
}

// ─── Known competitor domain map ─────────────────────────────────────────────
// Maps common company names to their actual domains

const KNOWN_DOMAINS: Record<string, string> = {
  'rivian': 'rivian.com',
  'lucid': 'lucidmotors.com',
  'lucid motors': 'lucidmotors.com',
  'polestar': 'polestar.com',
  'ford': 'ford.com',
  'hyundai': 'hyundai.com',
  'kia': 'kia.com',
  'bmw': 'bmw.com',
  'mercedes': 'mercedes-benz.com',
  'volkswagen': 'vw.com',
  'vw': 'vw.com',
  'gm': 'gm.com',
  'chevrolet': 'chevrolet.com',
  'chevy': 'chevrolet.com',
  'byd': 'byd.com',
  'tesla': 'tesla.com',
  'apple': 'apple.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'notion': 'notion.so',
  'clickup': 'clickup.com',
  'asana': 'asana.com',
  'linear': 'linear.app',
  'jira': 'atlassian.com',
  'slack': 'slack.com',
  'figma': 'figma.com',
  'airtable': 'airtable.com',
  'obsidian': 'obsidian.md',
  'stripe': 'stripe.com',
  'shopify': 'shopify.com',
  'hubspot': 'hubspot.com',
  'salesforce': 'salesforce.com',
  'zendesk': 'zendesk.com',
  'intercom': 'intercom.com',
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'midjourney': 'midjourney.com',
};

function normalizeDomain(input: string): string {
  // Already a full URL
  if (input.startsWith('http://') || input.startsWith('https://')) return input;

  const lower = input.toLowerCase().trim();

  // Check known domains map
  if (KNOWN_DOMAINS[lower]) return `https://${KNOWN_DOMAINS[lower]}`;

  // Has a dot — likely already a domain
  if (input.includes('.')) return `https://${input}`;

  // Convert name to domain: "Lucid Motors" → lucidmotors.com
  const slug = lower.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  return `https://${slug}.com`;
}

export async function scrapeCompetitor(domain: string): Promise<ScrapedCompetitor> {
  const baseUrl = normalizeDomain(domain);
  const result: ScrapedCompetitor = {
    domain,
    scraped_at: new Date().toISOString(),
  };

  // Pricing page
  for (const suffix of ['/pricing', '/plans', '/price']) {
    const html = await fetchPage(`${baseUrl}${suffix}`);
    if (html) {
      result.pricing = { url: `${baseUrl}${suffix}`, text: extractText(html) };
      break;
    }
  }

  // Homepage
  const homeHtml = await fetchPage(baseUrl);
  if (homeHtml) {
    result.homepage = { url: baseUrl, text: extractText(homeHtml) };
  }

  // Blog
  for (const suffix of ['/blog', '/news', '/updates']) {
    const html = await fetchPage(`${baseUrl}${suffix}`);
    if (html) {
      const titles = extractBlogTitles(html);
      if (titles.length > 0) {
        result.blog = { url: `${baseUrl}${suffix}`, titles };
        break;
      }
    }
  }

  logger.info('[Scraper] Complete', {
    domain,
    pages: [result.pricing && 'pricing', result.homepage && 'homepage', result.blog && 'blog']
      .filter(Boolean),
  });

  return result;
}
