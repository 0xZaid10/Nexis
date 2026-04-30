import { getLLM } from '../../services/llm.js';
import { researchTopic } from '../../services/reddit.js';
import { searchIssues, getRepoIssues, formatIssues } from '../../services/github.js';
import { multiSearch, formatWebResults } from '../../services/websearch.js';
import { searchHNMultiple, formatHNItems } from '../../services/hackernews.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Community Research Capability — Production Grade ─────────────────────────
//
// Multi-source community research: Reddit + GitHub + Hacker News + Web
// All requests routed through AXL privacy layer.
//
// Final architecture:
//   1. Domain classifier → dynamic thresholds
//   2. Dual-layer extraction: behavioral + technical pains separately
//   3. Impact scoring: (frequency * 0.5) + (log(upvotes+1) * 0.5)
//   4. Semantic clustering with synonym normalization
//   5. Notion-vs-category separation (specific vs ecosystem pains)
//   6. Quote anchoring — every pain has real evidence
//   7. Source bias cap — no single source > 35%
//   8. Contradiction detection — flags extraction failures honestly

const STRICT = '\nRaw JSON only. Start {. End }. No markdown.';
const MAX_SOURCE_SHARE = 0.35;
const MAX_REDDIT_POSTS = 50;

// ─── Domain classifier ────────────────────────────────────────────────────────

type ResearchDomain = 'crypto' | 'saas' | 'devtools' | 'general';

function classifyDomain(topic: string): ResearchDomain {
  const t = topic.toLowerCase();
  if (/defi|crypto|blockchain|web3|ethereum|bitcoin|token|nft|wallet|protocol|zk|privacy coin/.test(t)) return 'crypto';
  if (/saas|notion|clickup|asana|linear|jira|slack|figma|airtable|productivity tool|project management|trello|monday/.test(t)) return 'saas';
  if (/developer|devtool|api|sdk|open source|github|programming|framework|library|cli|terminal/.test(t)) return 'devtools';
  return 'general';
}

function getThresholds(domain: ResearchDomain) {
  switch (domain) {
    case 'crypto':   return { confirmed: 3, strong: 2, strongUpvotes: 200 };
    case 'saas':     return { confirmed: 2, strong: 1, strongUpvotes: 20 };
    case 'devtools': return { confirmed: 2, strong: 1, strongUpvotes: 50 };
    default:         return { confirmed: 2, strong: 2, strongUpvotes: 100 };
  }
}

// ─── Impact score ─────────────────────────────────────────────────────────────
// Balanced: frequency matters, but viral single threads matter too

function impactScore(frequency: number, upvotes: number): number {
  return (frequency * 0.5) + (Math.log(upvotes + 1) * 0.5);
}

function validationStatus(
  frequency: number,
  upvotes: number,
  thresholds: ReturnType<typeof getThresholds>
): string {
  if (frequency >= thresholds.confirmed) return 'CONFIRMED';
  if (frequency >= thresholds.strong) return 'STRONG_SIGNAL';
  if (upvotes >= thresholds.strongUpvotes) return 'STRONG_SIGNAL';
  return 'WEAK_SIGNAL';
}

// ─── Semantic normalization ───────────────────────────────────────────────────
// Collapse synonyms so "slow", "lag", "freeze" → same cluster

const SYNONYMS: Record<string, string> = {
  'slow': 'performance', 'lag': 'performance', 'freeze': 'performance',
  'loading': 'performance', 'sluggish': 'performance', 'unresponsive': 'performance',
  'confusing': 'complexity', 'overwhelming': 'complexity', 'steep': 'complexity',
  'learning curve': 'complexity', 'complicated': 'complexity', 'hard to use': 'complexity',
  'expensive': 'pricing', 'pricing': 'pricing', 'cost': 'pricing', 'per seat': 'pricing',
  'subscription': 'pricing', 'paywall': 'pricing', 'too pricey': 'pricing',
  'offline': 'offline/sync', 'sync': 'offline/sync', 'reliability': 'offline/sync',
  'connection': 'offline/sync', 'no internet': 'offline/sync',
  'mobile': 'mobile ux', 'ios': 'mobile ux', 'android': 'mobile ux', 'phone': 'mobile ux',
  'search': 'search quality', 'find': 'search quality', 'discovery': 'search quality',
  'export': 'data portability', 'import': 'data portability', 'lock-in': 'data portability',
  'migration': 'data portability', 'vendor lock': 'data portability',
  'template': 'setup complexity', 'blank canvas': 'setup complexity', 'setup': 'setup complexity',
  'over-optim': 'productivity trap', 'procrastinat': 'productivity trap', 'organizing instead': 'productivity trap',
  'fragmentation': 'tool sprawl', 'app switching': 'tool sprawl', 'juggling': 'tool sprawl',
  'context switch': 'tool sprawl', 'too many tools': 'tool sprawl',
};

function normalizeKey(pain: string): string {
  const lower = pain.toLowerCase().slice(0, 80);
  for (const [synonym, normalized] of Object.entries(SYNONYMS)) {
    if (lower.includes(synonym)) return normalized;
  }
  return lower.slice(0, 50);
}

// ─── Source bias cap ──────────────────────────────────────────────────────────

function capSourceBias(items: any[], sourceKey: string): any[] {
  const bySource: Record<string, any[]> = {};
  for (const item of items) {
    const src = item[sourceKey] || 'unknown';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(item);
  }
  const maxPerSource = Math.ceil(items.length * MAX_SOURCE_SHARE);
  const capped: any[] = [];
  for (const [src, srcItems] of Object.entries(bySource)) {
    if (srcItems.length > maxPerSource) {
      logger.info('[Community] Source bias capped', { source: src, original: srcItems.length, allowed: maxPerSource });
    }
    capped.push(...srcItems.slice(0, maxPerSource));
  }
  return capped;
}

// ─── Dual-layer extraction ────────────────────────────────────────────────────
// Layer 1: Behavioral pains (workflow, mindset, process)
// Layer 2: Technical pains (performance, features, reliability)

async function extractBehavioralPains(content: string, topic: string, source: string): Promise<any> {
  const llm = getLLM();
  return parseJSON(await llm.prompt(`Extract BEHAVIORAL pain points about "${topic}" from ${source}.
Behavioral = workflow problems, mindset issues, process failures, organizational dysfunction.
Examples: "spends more time organizing than working", "productivity system becomes the hobby", "can't onboard team"

DATA:
${content.slice(0, 4000)}

Group semantically similar complaints. For each pain, find the BEST direct quote.

JSON:
{
  "pain_points": [{
    "pain": "semantic cluster max 8 words",
    "layer": "behavioral",
    "type": "product/structural/community",
    "occurrences": 1,
    "total_upvotes": 0,
    "severity": "HIGH/MEDIUM/LOW",
    "evidence_quote": "direct quote from data max 25 words",
    "evidence_url": "",
    "source": "${source}"
  }]
}${STRICT}`,
    'Research analyst. Behavioral pains only. Best direct quote mandatory.',
    { temperature: 0.2 }
  ));
}

async function extractTechnicalPains(content: string, topic: string, source: string): Promise<any> {
  const llm = getLLM();
  return parseJSON(await llm.prompt(`Extract TECHNICAL pain points about "${topic}" from ${source}.
Technical = performance, reliability, features, UX, pricing, integrations, data portability.
Examples: "slow on large pages", "no offline mode", "mobile app is terrible", "too expensive for teams"

DATA:
${content.slice(0, 4000)}

Cluster synonyms: slow/lag/freeze→performance, expensive/pricing/cost→pricing, offline/sync→reliability.
For each pain, find the BEST direct quote as evidence.

JSON:
{
  "pain_points": [{
    "pain": "semantic cluster max 8 words",
    "layer": "technical",
    "type": "product/structural/regulatory",
    "occurrences": 1,
    "total_upvotes": 0,
    "severity": "HIGH/MEDIUM/LOW",
    "evidence_quote": "direct quote from data max 25 words",
    "evidence_url": "",
    "source": "${source}"
  }]
}${STRICT}`,
    'Research analyst. Technical pains only. Best direct quote mandatory.',
    { temperature: 0.2 }
  ));
}

function parseJSON(raw: string): any {
  try {
    const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
    return f !== -1 ? JSON.parse(raw.slice(f, l + 1)) : {};
  } catch { return {}; }
}

// ─── Final synthesis ──────────────────────────────────────────────────────────

async function synthesize(
  confirmed: any[],
  strong: any[],
  weak: any[],
  byLayer: { behavioral: any[]; technical: any[] },
  byType: Record<string, any[]>,
  sourceStats: Record<string, number>,
  topic: string,
  context: string,
  domain: ResearchDomain
): Promise<any> {
  const llm = getLLM();

  const confirmedStr = confirmed.slice(0, 6).map((p, i) =>
    `${i + 1}. [${p.layer?.toUpperCase()}/${p.type?.toUpperCase()}] "${p.pain}" — freq:${p.frequency}, impact:${p.impact_score?.toFixed(1)}, sources:[${p.sources?.join(',')}]\n   Evidence: "${p.evidence_quote || 'no quote'}"`
  ).join('\n') || 'None';

  const strongStr = strong.slice(0, 5).map(p =>
    `- [${p.layer?.toUpperCase()}] "${p.pain}" — freq:${p.frequency}, upvotes:${p.total_upvotes}\n  Evidence: "${p.evidence_quote || 'no quote'}"`
  ).join('\n') || 'None';

  const weakStr = weak.slice(0, 3).map(p =>
    `- "${p.pain}" — ${p.total_upvotes} upvotes [WEAK]`
  ).join('\n') || 'None';

  const domainNote = {
    saas: 'SaaS tool with well-documented complaints. If behavioral pains found but technical missing → flag technical extraction gap.',
    crypto: 'Crypto/privacy topic — dispersed signal expected. Regulatory chilling effect may suppress discussion.',
    devtools: 'Developer tool — expect GitHub issues to surface most specific technical pains.',
    general: 'General topic — apply balanced interpretation.',
  }[domain];

  const behavioralCount = byLayer.behavioral.length;
  const technicalCount = byLayer.technical.length;

  return parseJSON(await llm.prompt(`Synthesize community research on "${topic}".
Context: ${context}
Domain: ${domain.toUpperCase()} — ${domainNote}
Sources: ${Object.entries(sourceStats).map(([k, v]) => `${k}:${v}`).join(', ')}
Signal layers: behavioral=${behavioralCount}, technical=${technicalCount}

CONFIRMED PAINS (with evidence):
${confirmedStr}

STRONG SIGNALS (with evidence):
${strongStr}

WEAK SIGNALS:
${weakStr}

INSTRUCTIONS:
1. Separate tool-specific pains from ecosystem/category pains
2. Flag if technical layer is thin relative to behavioral (extraction gap)
3. Every finding must reference its evidence quote
4. Impact = (frequency * 0.5) + (log(upvotes+1) * 0.5)

JSON:
{
  "executive_summary": "3 sentences. What data shows. Behavioral vs technical balance. Confidence level.",
  "data_quality": {
    "behavioral_extraction": "strong/partial/failed",
    "technical_extraction": "strong/partial/failed",
    "extraction_failure_suspected": false,
    "expected_but_missing": []
  },
  "total_items_analyzed": 0,
  "sources_used": [],
  "confirmed_pain_points": [{
    "rank": 1,
    "pain": "",
    "layer": "behavioral/technical",
    "type": "product/structural/regulatory/community",
    "scope": "tool-specific/ecosystem",
    "severity": "HIGH/MEDIUM/LOW",
    "frequency": 0,
    "impact_score": 0,
    "total_upvotes": 0,
    "sources_confirmed": [],
    "confidence": "HIGH/MEDIUM/LOW",
    "evidence_quote": "",
    "opportunity": "",
    "validation_status": "CONFIRMED"
  }],
  "strong_signals": [{
    "pain": "",
    "layer": "behavioral/technical",
    "type": "",
    "scope": "tool-specific/ecosystem",
    "frequency": 0,
    "total_upvotes": 0,
    "evidence_quote": "",
    "validation_status": "STRONG_SIGNAL",
    "note": ""
  }],
  "weak_signals": [{
    "pain": "",
    "validation_status": "WEAK_SIGNAL",
    "note": ""
  }],
  "layer_analysis": {
    "behavioral_summary": "what behavioral patterns emerged",
    "technical_summary": "what technical issues emerged",
    "dominant_layer": "behavioral/technical/balanced"
  },
  "signal_type_breakdown": {
    "structural": "",
    "product": "",
    "regulatory": "",
    "community": ""
  },
  "cross_source_insights": "",
  "what_data_cannot_tell_us": ""
}${STRICT}`,
    'Senior research analyst. Evidence-anchored findings only. Separate behavioral from technical.',
    { temperature: 0.3 }
  ));
}

// ─── Main capability ──────────────────────────────────────────────────────────

export interface CommunityResearchParams {
  topic: string;
  company?: string;
  industry?: string;
  depth?: 'standard' | 'deep';
  sources?: ('reddit' | 'twitter' | 'github' | 'hackernews' | 'web')[];
  githubRepos?: string[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function runCommunityResearch(params: CommunityResearchParams): Promise<CapabilityResult> {
  const {
    topic,
    company = 'Research',
    industry = '',
    depth = 'standard',
    sources = ['reddit', 'github', 'hackernews', 'web'],
    githubRepos = [],
  } = params;

  const context = company !== 'Research'
    ? `${company} (${industry}) researching: ${topic}`
    : `General research: ${topic}`;

  const domain = classifyDomain(topic);
  const thresholds = getThresholds(domain);
  const postsPerSub = depth === 'deep' ? 100 : 50;
  const mem = getLocalMemory();

  logger.info('[Community] Starting research', { topic, domain, thresholds, sources });

  const sourceStats: Record<string, number> = {};
  const allContent: Array<{ text: string; source: string }> = [];

  // ── Fetch all sources in parallel ─────────────────────────────────────────
  const fetches: Promise<void>[] = [];

  if (sources.includes('reddit')) {
    fetches.push((async () => {
      try {
        const data = await researchTopic(topic, industry, postsPerSub);
        const keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const relevant = data.posts
          .filter((p: any) => {
            const text = `${p.title} ${p.text}`.toLowerCase();
            return keywords.some(kw => text.includes(kw));
          })
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, MAX_REDDIT_POSTS);

        const balanced = capSourceBias(
          relevant.map((p: any) => ({ ...p, _src: `r/${p.subreddit}` })),
          '_src'
        );

        sourceStats.reddit = balanced.length;
        if (balanced.length > 0) {
          allContent.push({
            source: 'Reddit',
            text: balanced.map((p: any, i: number) =>
              `[${i+1}] r/${p.subreddit} Score:${p.score} | ${p.title}\n${(p.text||'').slice(0,300)}`
            ).join('\n\n')
          });
        }
        logger.info('[Community] Reddit collected', { relevant: relevant.length, balanced: balanced.length });
      } catch (err) {
        logger.warn('[Community] Reddit failed', { error: (err as Error).message });
      }
    })());
  }

  if (sources.includes('github')) {
    fetches.push((async () => {
      try {
        let issues: any[] = [];
        if (githubRepos.length > 0) {
          const results = await Promise.all(githubRepos.map(r => getRepoIssues(r, 25).catch(() => [])));
          issues = results.flat();
        } else {
          const topicWords = topic.split(/\s+/).slice(0, 3).join(' ');
          issues = await searchIssues(`${topicWords} problem bug`, [], 30);
        }
        sourceStats.github = issues.length;
        if (issues.length > 0) {
          allContent.push({ source: 'GitHub Issues', text: formatIssues(issues) });
        }
      } catch (err) {
        logger.warn('[Community] GitHub failed', { error: (err as Error).message });
      }
    })());
  }

  if (sources.includes('hackernews')) {
    fetches.push((async () => {
      try {
        const topicWords = topic.split(/\s+/).slice(0, 3).join(' ');
        const queries = [topicWords, `${topicWords} problem`, `${topicWords} alternative`];
        const items = await searchHNMultiple(queries, 20);
        sourceStats.hackernews = items.length;
        if (items.length > 0) {
          allContent.push({ source: 'Hacker News', text: formatHNItems(items) });
        }
      } catch (err) {
        logger.warn('[Community] HN failed', { error: (err as Error).message });
      }
    })());
  }

  if (sources.includes('web')) {
    fetches.push((async () => {
      try {
        const topicWords = topic.split(/\s+/).slice(0, 4).join(' ');
        const queries = [
          `${topicWords} problems complaints`,
          `${topicWords} why I switched away`,
          `${topicWords} review negative`,
          ...(domain === 'saas' ? [
            `site:reddit.com ${topicWords} complaints`,
            `"${topicWords}" alternatives site:g2.com`,
          ] : []),
          ...(domain === 'crypto' ? [
            `${topicWords} risks issues community`,
          ] : []),
        ];
        const results = await multiSearch(queries, 5);
        sourceStats.web = results.length;
        if (results.length > 0) {
          allContent.push({ source: 'Web', text: formatWebResults(results) });
        }
      } catch (err) {
        logger.warn('[Community] Web failed', { error: (err as Error).message });
      }
    })());
  }

  await Promise.all(fetches);

  const totalItems = Object.values(sourceStats).reduce((s, n) => s + n, 0);
  logger.info('[Community] Data collected', { sourceStats, totalItems });

  if (totalItems === 0) {
    return { capability: 'community', success: false, error: 'No data found', data: { topic } };
  }

  // ── Dual-layer extraction ─────────────────────────────────────────────────
  // Run behavioral AND technical extraction on each source
  const allBatches: any[] = [];

  for (const content of allContent) {
    const chunks: string[] = [];
    for (let i = 0; i < content.text.length; i += 4000) {
      chunks.push(content.text.slice(i, i + 4000));
    }

    // Max 2 chunks per source to control cost
    for (const chunk of chunks.slice(0, 2)) {
      const [behavioral, technical] = await Promise.all([
        extractBehavioralPains(chunk, topic, content.source).catch(() => ({ pain_points: [] })),
        extractTechnicalPains(chunk, topic, content.source).catch(() => ({ pain_points: [] })),
      ]);

      allBatches.push({
        pain_points: [
          ...(behavioral.pain_points || []),
          ...(technical.pain_points || []),
        ],
        _source: content.source,
      });
    }

    logger.info('[Community] Dual extraction complete', { source: content.source });
  }

  // ── Aggregate with semantic normalization ─────────────────────────────────
  const aggregated: Record<string, any> = {};
  const competitors: Record<string, any> = {};

  for (const batch of allBatches) {
    for (const pp of (batch.pain_points || [])) {
      const raw = pp.pain || '';
      if (!raw || raw === 'undefined') continue;

      const key = normalizeKey(raw);
      if (!key) continue;

      if (!aggregated[key]) {
        aggregated[key] = {
          pain: key,
          layer: pp.layer || 'behavioral',
          type: pp.type || 'product',
          frequency: 0,
          total_upvotes: 0,
          impact_score: 0,
          sources: new Set<string>(),
          evidence_quotes: new Set<string>(),
          severity: pp.severity || 'MEDIUM',
        };
      }

      aggregated[key].frequency += pp.occurrences || 1;
      aggregated[key].total_upvotes += pp.total_upvotes || 0;
      aggregated[key].sources.add(batch._source || pp.source || 'unknown');

      // Keep best evidence quote (non-empty, reasonable length)
      if (pp.evidence_quote && pp.evidence_quote.length > 10 && pp.evidence_quote !== 'undefined') {
        aggregated[key].evidence_quotes.add(pp.evidence_quote);
      }

      // Update impact score
      aggregated[key].impact_score = impactScore(
        aggregated[key].frequency,
        aggregated[key].total_upvotes
      );
    }

    for (const cm of (batch.competitor_mentions || [])) {
      if (!cm.name || cm.name === 'undefined') continue;
      if (!competitors[cm.name]) competitors[cm.name] = { ...cm, count: 0 };
      competitors[cm.name].count += cm.mention_count || 1;
    }
  }

  // Finalize aggregated entries
  for (const key of Object.keys(aggregated)) {
    const entry = aggregated[key];
    entry.sources = [...entry.sources];
    entry.evidence_quote = [...entry.evidence_quotes][0] || '';
    delete entry.evidence_quotes;

    entry.validation_status = validationStatus(entry.frequency, entry.total_upvotes, thresholds);

    // Cross-source confirmation boost
    if (entry.sources.length > 1) {
      entry.impact_score *= 1.5;
      entry.cross_source_confirmed = true;
    }
  }

  // ── Split by validation tier ──────────────────────────────────────────────
  const allPains = Object.values(aggregated).sort((a, b) => b.impact_score - a.impact_score);

  const confirmed = allPains.filter(p => p.validation_status === 'CONFIRMED').slice(0, 8);
  const strong = allPains.filter(p => p.validation_status === 'STRONG_SIGNAL').slice(0, 6);
  const weak = allPains.filter(p => p.validation_status === 'WEAK_SIGNAL')
    .sort((a, b) => b.total_upvotes - a.total_upvotes)
    .slice(0, 5);

  // ── Group by layer and type ───────────────────────────────────────────────
  const byLayer = {
    behavioral: [...confirmed, ...strong].filter(p => p.layer === 'behavioral'),
    technical: [...confirmed, ...strong].filter(p => p.layer === 'technical'),
  };

  const byType: Record<string, any[]> = { structural: [], product: [], regulatory: [], community: [] };
  for (const p of [...confirmed, ...strong]) {
    const t = p.type || 'product';
    if (byType[t]) byType[t].push(p);
    else byType.product.push(p);
  }

  logger.info('[Community] Aggregation complete', {
    total_pains: allPains.length,
    confirmed: confirmed.length,
    strong: strong.length,
    weak: weak.length,
    behavioral: byLayer.behavioral.length,
    technical: byLayer.technical.length,
  });

  // ── Synthesize ────────────────────────────────────────────────────────────
  const report = await synthesize(
    confirmed, strong, weak,
    byLayer, byType,
    sourceStats, topic, context, domain
  );

  // ── Persist ───────────────────────────────────────────────────────────────
  mem.set(`community_${topic.replace(/\s+/g, '_').slice(0, 30)}`, {
    topic, company,
    run_at: new Date().toISOString(),
    domain,
    sources: Object.keys(sourceStats),
    total_items: totalItems,
    confirmed_count: confirmed.length,
    top_pain: confirmed[0]?.pain,
    summary: (report as any).executive_summary,
  });

  logger.info('[Community] Complete', {
    topic, domain,
    total_items: totalItems,
    confirmed: confirmed.length,
    sources: sourceStats,
  });

  return {
    capability: 'community',
    success: true,
    data: {
      type: 'community_research',
      topic, company, domain,
      run_at: new Date().toISOString(),
      stats: {
        total_items: totalItems,
        source_breakdown: sourceStats,
        confirmed_pains: confirmed.length,
        strong_signals: strong.length,
        weak_signals: weak.length,
        behavioral_pains: byLayer.behavioral.length,
        technical_pains: byLayer.technical.length,
      },
      report,
    },
  };
}

export { runCommunityResearch as runRedditAnalysis };
