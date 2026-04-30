import { getLLM } from '../../services/llm.js';
import { scrapeCompetitor } from '../../services/scraper.js';
import { scrapeCompetitorReviews, searchHackerNews, scrapeProductHunt, scrapeHiringSignals } from '../../services/social-scraper.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Market Research Capability ───────────────────────────────────────────────
// Ported from agent-src/agents/market-researcher.js

const STRICT = '\nRaw JSON only. Start {. End }. No markdown. Strings MAX 15 words.';

export interface MarketParams {
  topic: string;
  company: string;
  industry?: string;
  competitors?: string[];
  profileCtx?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function parseJSON(raw: string): unknown {
  try {
    const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
    return f !== -1 ? JSON.parse(raw.slice(f, l + 1)) : {};
  } catch { return {}; }
}

async function analyzeReviews(competitor: string, posts: any[], company: string): Promise<unknown> {
  const llm = getLLM();
  if (!posts.length) return {
    total_reviews: 0, sentiment: 'unknown', confidence: 'NONE',
    top_complaints: [], top_praises: [], switching_triggers: [],
    feature_gaps: [], opportunity_for_us: 'No data available', data_source: 'NO_DATA'
  };

  const formatted = posts.slice(0, 20).map((p, i) =>
    `[${i + 1}] Score:${p.score} | ${p.title} | ${(p.text || '').slice(0, 200)}`
  ).join('\n');

  return parseJSON(await llm.prompt(`Analyze ${competitor} user reviews for ${company}.
${posts.length} Reddit posts (real scraped data).

POSTS:
${formatted}

JSON:
{
  "total_reviews": ${posts.length},
  "sentiment": "positive/negative/mixed/unknown",
  "confidence": "HIGH/MEDIUM/LOW",
  "top_complaints": [{"complaint":"","evidence_count":0,"data_source":"SCRAPED_REDDIT"}],
  "top_praises": [{"praise":"","evidence_count":0}],
  "switching_triggers": [],
  "feature_gaps": [],
  "opportunity_for_us": "",
  "data_limitations": ""
}${STRICT}`,
    `Review analyst for ${company}. Only state what posts explicitly say.`,
    { temperature: 0.2 }
  ));
}

async function analyzePricingLandscape(competitors: string[], scrapedData: Record<string, any>, company: string): Promise<unknown> {
  const llm = getLLM();
  const snippets = competitors.map(c => {
    const text = scrapedData[c]?.pricing?.text || 'No pricing page accessible';
    return `${c} (SCRAPED):\n${text.slice(0, 500)}`;
  }).join('\n\n---\n\n');

  return parseJSON(await llm.prompt(`Pricing landscape for ${company}'s market.

COMPETITOR PRICING:
${snippets}

JSON:
{
  "pricing_models_found": [],
  "price_range": {"low":"$0","mid":"$X/mo","high":"$Y/mo"},
  "free_tier_prevalence": "",
  "dominant_model": "",
  "pricing_gaps": [],
  "our_positioning": "",
  "recommendation": "",
  "confidence": "HIGH/MEDIUM/LOW"
}${STRICT}`,
    'Pricing strategist. Only state prices found on scraped pages.',
    { temperature: 0.2 }
  ));
}

async function buildFeatureMatrix(competitors: string[], scrapedData: Record<string, any>, company: string): Promise<unknown> {
  const llm = getLLM();
  const snippets = competitors.map(c => {
    const text = scrapedData[c]?.homepage?.text || 'Homepage not accessible';
    return `${c} (SCRAPED homepage):\n${text.slice(0, 600)}`;
  }).join('\n\n---\n\n');

  return parseJSON(await llm.prompt(`Feature matrix for ${company}'s market.

COMPETITOR HOMEPAGES:
${snippets}

JSON:
{
  "common_features": [{"feature":"","data_basis":"SCRAPED/INFERRED"}],
  "differentiating_features": [{"feature":"","has":[],"missing":[]}],
  "feature_gaps": [{"gap":"","confidence":"HIGH/MEDIUM/LOW"}],
  "our_advantages": [{"advantage":"","confidence":"HIGH/MEDIUM/LOW"}],
  "our_gaps": [{"gap":"","confidence":"HIGH/MEDIUM/LOW"}]
}${STRICT}`,
    'Feature analyst. Only list features explicitly on pages.',
    { temperature: 0.2 }
  ));
}

async function analyzeMarketSignals(hnResults: any[], phResults: any[], topic: string, company: string): Promise<unknown> {
  const llm = getLLM();
  const hn = hnResults.slice(0, 8).map(h => `HN(${h.points}pts): ${h.title}`).join('\n') || 'No HN results';
  const ph = phResults.slice(0, 8).map(p => `PH: ${p.name} — ${p.tagline}`).join('\n') || 'No PH results';

  return parseJSON(await llm.prompt(`Market signals for "${topic}" for ${company}.

HACKER NEWS: ${hn}
PRODUCT HUNT: ${ph}

JSON:
{
  "market_interest_level": "high/medium/low",
  "interest_confidence": "HIGH/MEDIUM/LOW",
  "trending_topics": [{"topic":"","evidence":""}],
  "emerging_competitors": [{"name":"","source":"HN/PH"}],
  "developer_sentiment": "",
  "timing": "",
  "data_limitations": ""
}${STRICT}`,
    'Market analyst. Be honest about signal strength.',
    { temperature: 0.3 }
  ));
}

export async function runMarketResearch(params: MarketParams): Promise<CapabilityResult> {
  const { topic, company, industry = '', competitors = [], profileCtx = `${company} (${industry})` } = params;
  const llm = getLLM();
  const mem = getLocalMemory();

  if (!competitors.length) {
    return { capability: 'market', success: false, error: 'No competitors provided', data: null };
  }

  logger.info('[Capability:Market] Starting', { company, topic, competitors });

  // Scrape competitor sites
  const scrapedData: Record<string, any> = {};
  await Promise.all(competitors.map(async (c) => {
    scrapedData[c] = await scrapeCompetitor(c).catch(() => ({}));
  }));

  // Reddit reviews
  const rawReviews: Record<string, any[]> = {};
  await Promise.all(competitors.map(async (c) => {
    rawReviews[c] = await scrapeCompetitorReviews(c, 30).catch(() => []);
  }));

  // Analyze reviews
  const reviewAnalyses = await Promise.all(competitors.map(async (competitor) => {
    const analysis = await analyzeReviews(competitor, rawReviews[competitor], company);
    return { competitor, reddit_posts: rawReviews[competitor].length, analysis };
  }));

  // Pricing + features + signals in parallel
  const [pricingLandscape, featureMatrix, hnResults, phResults, ...hiringResults] = await Promise.all([
    analyzePricingLandscape(competitors, scrapedData, company),
    buildFeatureMatrix(competitors, scrapedData, company),
    searchHackerNews(topic, 15).catch(() => []),
    scrapeProductHunt(topic, 10).catch(() => []),
    ...competitors.map(c => scrapeHiringSignals(c, 5).catch(() => [])),
  ]) as any[];

  const hiringSignals: Record<string, any[]> = {};
  competitors.forEach((c, i) => { hiringSignals[c] = hiringResults[i] || []; });

  const marketSignals = await analyzeMarketSignals(hnResults, phResults, topic, company);

  // Executive summary
  const reviewSnippet = reviewAnalyses.map(r =>
    `${r.competitor} (${r.reddit_posts} Reddit posts): ${JSON.stringify((r.analysis as any)?.top_complaints?.[0] || 'no complaints found')}`
  ).join('\n');

  const executiveSummaryRaw = await llm.prompt(`Executive market research for ${company}.
Context: ${profileCtx}

REVIEW INTELLIGENCE: ${reviewSnippet}
PRICING: ${JSON.stringify(pricingLandscape).slice(0, 300)}
FEATURE GAPS: ${JSON.stringify((featureMatrix as any)?.feature_gaps || []).slice(0, 200)}
MARKET SIGNALS: ${JSON.stringify(marketSignals).slice(0, 300)}

JSON:
{
  "market_summary": "2 sentences with confidence level",
  "biggest_opportunity": "",
  "recommended_positioning": "",
  "top3_insights": [{"insight":"","evidence":"","confidence":"HIGH/MEDIUM/LOW","action":""}],
  "go_to_market_recommendation": "",
  "reality_check": {"what_we_dont_know":"","alternative_interpretation":""},
  "one_thing": "",
  "overall_confidence": "HIGH/MEDIUM/LOW"
}${STRICT}`,
    'Senior market strategist. Be honest about confidence.',
    { temperature: 0.3 }
  );

  const executiveSummary = parseJSON(executiveSummaryRaw);

  mem.set(`market_${topic}_${new Date().toISOString().split('T')[0]}`, {
    topic, company, run_at: new Date().toISOString(),
    summary: (executiveSummary as any)?.market_summary,
    biggest_opportunity: (executiveSummary as any)?.biggest_opportunity,
  });

  logger.info('[Capability:Market] Complete', { company, topic });

  return {
    capability: 'market',
    success: true,
    data: {
      type: 'market_research',
      company, topic,
      run_at: new Date().toISOString(),
      executive_summary: executiveSummary,
      pricing_landscape: pricingLandscape,
      feature_matrix: featureMatrix,
      review_analysis: reviewAnalyses,
      market_signals: { hacker_news: hnResults.slice(0, 5), product_hunt: phResults.slice(0, 5), analysis: marketSignals },
      hiring_signals: hiringSignals,
    },
  };
}
