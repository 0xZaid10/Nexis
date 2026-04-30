import { getLLM } from '../../services/llm.js';
import { scrapeCompetitor } from '../../services/scraper.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Competitive Intelligence Capability ──────────────────────────────────────
// Ported from agent-src/agents/competeiq.js
// Scrapes competitors and generates multi-layer analysis with steelman

const STRICT = '\nRaw JSON only. Start {. End }. No markdown. Strings MAX 15 words.';

export interface CompetitiveParams {
  competitors: string[];
  company: string;
  industry?: string;
  profileCtx?: string;
  brutalMode?: boolean;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

async function analyzePricing(
  competitor: string,
  pricingText: string,
  company: string,
  profileCtx: string
): Promise<unknown> {
  const llm = getLLM();
  if (!pricingText) return {
    model: 'No pricing page found', tiers: [], key_numbers: [],
    free_tier: false, vs_us: 'N/A', data_source: 'UNAVAILABLE', confidence: 'LOW'
  };

  return JSON.parse(await llm.prompt(`Pricing for ${competitor} vs ${company}. Context: ${profileCtx}

PAGE (scraped directly):
${pricingText.slice(0, 2000)}

JSON (strings MAX 12 words):
{
  "model": "",
  "tiers": [{"name":"","price":"","highlight":""}],
  "key_numbers": [],
  "free_tier": true,
  "vs_us": "",
  "data_source": "SCRAPED_PRICING_PAGE",
  "confidence": "HIGH",
  "scraped_at": "${new Date().toISOString()}"
}${STRICT}`,
    'Pricing analyst. Raw JSON only. Only state what is explicitly on the page.',
    { temperature: 0.2 }
  ).then(r => { const f = r.indexOf('{'), l = r.lastIndexOf('}'); return f !== -1 ? r.slice(f, l + 1) : '{}'; }));
}

async function analyzeContent(
  competitor: string,
  homepageText: string,
  blogTitles: string[],
  company: string,
  profileCtx: string
): Promise<unknown> {
  const llm = getLLM();
  const blog = blogTitles.slice(0, 5).join(' | ') || 'none';

  return JSON.parse(await llm.prompt(`Content for ${competitor} vs ${company}. Context: ${profileCtx}

HOMEPAGE (scraped): ${(homepageText || '').slice(0, 2000)}
BLOG TITLES (scraped): ${blog}

JSON:
{
  "narrative": "",
  "target_audience": "",
  "ai_positioning": "",
  "counter_title": "",
  "counter_angle": "",
  "data_source": "SCRAPED_HOMEPAGE_AND_BLOG",
  "confidence": "MEDIUM"
}${STRICT}`,
    'Content analyst. Raw JSON only.',
    { temperature: 0.2 }
  ).then(r => { const f = r.indexOf('{'), l = r.lastIndexOf('}'); return f !== -1 ? r.slice(f, l + 1) : '{}'; }));
}

async function analyzeThreats(
  competitor: string,
  pricingModel: string,
  pricingVsUs: string,
  narrative: string,
  aiAngle: string,
  previousSummary: string | null,
  company: string,
  profileCtx: string
): Promise<unknown> {
  const llm = getLLM();
  const prev = previousSummary ? `Last week: ${previousSummary.slice(0, 120)}` : 'First run.';

  return JSON.parse(await llm.prompt(`Threat analysis: ${competitor} vs ${company}.
Context: ${profileCtx}
Pricing: ${pricingModel} | ${pricingVsUs}
Narrative: ${narrative} | AI: ${aiAngle}
${prev}

JSON:
{
  "top3_threats": [{"threat":"","urgency":"THIS_WEEK/THIS_MONTH","impact":"HIGH/MEDIUM/LOW","confidence":"HIGH/MEDIUM/LOW","confidence_basis":"","why_us":""}],
  "top3_opportunities": [{"opportunity":"","action":"","window":"","confidence":"HIGH/MEDIUM/LOW"}],
  "steelman": {"why_competitor_wins":"","their_real_strength":"","where_you_actually_lose":""},
  "delta": {"has_changes":false,"week_over_week":[],"trajectory":"stable"}
}${STRICT}`,
    `Competitive analyst for ${company}. Steelman the competitor.`,
    { temperature: 0.3 }
  ).then(r => { const f = r.indexOf('{'), l = r.lastIndexOf('}'); return f !== -1 ? r.slice(f, l + 1) : '{}'; }));
}

async function analyzeDecisions(
  competitor: string,
  topThreat: string,
  topOpportunity: string,
  pricingModel: string,
  narrative: string,
  company: string,
  profileCtx: string
): Promise<unknown> {
  const llm = getLLM();

  return JSON.parse(await llm.prompt(`Decisions: ${competitor} vs ${company}.
Context: ${profileCtx}
Threat: ${topThreat} | Opportunity: ${topOpportunity}
Pricing: ${pricingModel} | Narrative: ${narrative}

JSON:
{
  "decisions": [{"decision":"IGNORE/MONITOR/ACT_NOW/SHIP_THIS","subject":"","urgency":"","reason":"","what_would_change_this":""}],
  "unexpected_insight": {"insight":"","signal":"","implication":"","confidence":"HIGH/MEDIUM/LOW","could_be_wrong_if":""},
  "reality_check": {"weakest_part_of_this_analysis":"","data_we_dont_have":"","skeptic_would_say":""},
  "summary": "3 sentences. What changed, why it matters, what to do."
}${STRICT}`,
    `Competitive analyst for ${company}. Be honest about uncertainty.`,
    { temperature: 0.3 }
  ).then(r => { const f = r.indexOf('{'), l = r.lastIndexOf('}'); return f !== -1 ? r.slice(f, l + 1) : '{}'; }));
}

export async function runCompetitiveIntel(params: CompetitiveParams): Promise<CapabilityResult> {
  const { competitors, company, industry = '', profileCtx = `${company} (${industry})`, brutalMode = false } = params;
  const llm = getLLM();
  const mem = getLocalMemory();

  logger.info('[Capability:Competitive] Starting', { company, competitors });

  const results = [];

  for (const competitor of competitors) {
    logger.info('[Capability:Competitive] Processing', { competitor });

    const scraped = await scrapeCompetitor(competitor);
    const previousSummary: string | null = null; // Retrieved from memory in future

    const [pricingIntel, contentIntel] = await Promise.all([
      analyzePricing(competitor, scraped.pricing?.text || '', company, profileCtx),
      analyzeContent(competitor, scraped.homepage?.text || '', scraped.blog?.titles || [], company, profileCtx)
    ]) as any[];

    const threatsAnalysis = await analyzeThreats(
      competitor,
      (pricingIntel.model || 'unknown').slice(0, 80),
      (pricingIntel.vs_us || 'unknown').slice(0, 80),
      (contentIntel.narrative || 'unknown').slice(0, 80),
      (contentIntel.ai_positioning || 'unknown').slice(0, 80),
      previousSummary,
      company, profileCtx
    ) as any;

    const topThreat = (threatsAnalysis.top3_threats?.[0]?.threat || 'unknown').slice(0, 100);
    const topOpportunity = (threatsAnalysis.top3_opportunities?.[0]?.opportunity || 'unknown').slice(0, 100);

    const decisionsAnalysis = await analyzeDecisions(
      competitor, topThreat, topOpportunity,
      (pricingIntel.model || 'unknown').slice(0, 80),
      (contentIntel.narrative || 'unknown').slice(0, 80),
      company, profileCtx
    ) as any;

    results.push({
      competitor,
      top3_threats: threatsAnalysis.top3_threats || [],
      top3_opportunities: threatsAnalysis.top3_opportunities || [],
      steelman: threatsAnalysis.steelman || {},
      decisions: decisionsAnalysis.decisions || [],
      unexpected_insight: decisionsAnalysis.unexpected_insight || {},
      reality_check: decisionsAnalysis.reality_check || {},
      summary: decisionsAnalysis.summary || '',
      pricing_intel: pricingIntel,
      content_intel: contentIntel,
      scraped_at: scraped.scraped_at,
    });

    logger.info('[Capability:Competitive] Competitor done', { competitor });
  }

  // Executive brief
  const briefInput = results.map(r =>
    `${r.competitor}: ${(r.summary || '').slice(0, 120)} | Threat: ${r.top3_threats?.[0]?.threat || 'none'} | Decision: ${r.decisions?.[0]?.decision} ${r.decisions?.[0]?.subject || ''}`
  ).join('\n');

  const masterBriefRaw = await llm.prompt(`CEO brief for ${company}.

${briefInput}

JSON:
{
  "week": "${new Date().toISOString().split('T')[0]}",
  "tldr": "",
  "top3_this_week": [{"rank":1,"what":"","why_it_matters":"","action":""}],
  "decision_board": [{"decision":"IGNORE/MONITOR/ACT_NOW/SHIP_THIS","subject":"","owner":"","deadline":""}],
  "biggest_threat_right_now": {"threat":"","from":"","runway":"","confidence":"HIGH/MEDIUM/LOW"},
  "one_thing": ""
}${STRICT}`,
    'Senior analyst. Be concise and actionable.',
    { temperature: 0.2 }
  );

  let masterBrief: unknown = {};
  try {
    const f = masterBriefRaw.indexOf('{'), l = masterBriefRaw.lastIndexOf('}');
    if (f !== -1) masterBrief = JSON.parse(masterBriefRaw.slice(f, l + 1));
  } catch { masterBrief = { raw: masterBriefRaw.slice(0, 500) }; }

  // Save to local memory
  mem.set(`competitive_${company}_${new Date().toISOString().split('T')[0]}`, {
    company, competitors, run_at: new Date().toISOString(),
  });

  logger.info('[Capability:Competitive] Complete', { company, competitors: results.length });

  return {
    capability: 'competitive',
    success: true,
    data: {
      type: 'competitive_intel',
      company,
      run_at: new Date().toISOString(),
      competitors: results,
      executive_brief: masterBrief,
    },
  };
}
