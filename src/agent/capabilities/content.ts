import { getLLM } from '../../services/llm.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── Content Writing Capability ───────────────────────────────────────────────
// Ported from agent-src/agents/content-writer.js

export interface ContentParams {
  type: 'blog_post' | 'twitter_thread' | 'linkedin_post' | 'reddit_post' | 'content_brief';
  topic: string;
  company: string;
  industry?: string;
  tone?: string;
  keyword?: string;
  tweets?: number;
  angle?: string;
  subreddit?: string;
  researchContext?: string; // injected from previous capability results
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function parseJSON(raw: string): unknown {
  try {
    const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
    return f !== -1 ? JSON.parse(raw.slice(f, l + 1)) : {};
  } catch { return {}; }
}

async function writeBlogPost(params: ContentParams): Promise<unknown> {
  const { topic, company, industry = '', tone = 'authoritative and practical', keyword, researchContext = '' } = params;
  const llm = getLLM();

  const outline = parseJSON(await llm.prompt(`SEO blog post outline for ${company} on: "${topic}"

RESEARCH DATA:
${researchContext || 'No research data yet.'}

PROFILE: ${company} (${industry})
TONE: ${tone}
TARGET KEYWORD: ${keyword || topic}

Rules:
- Only cite statistics if they appear in research data above
- Do NOT fabricate statistics or case study results

JSON:
{
  "title": "SEO title with keyword",
  "meta_description": "155 chars max",
  "target_keyword": "${keyword || topic}",
  "secondary_keywords": [],
  "sections": [{"heading":"H2 heading","key_points":["point1","point2"],"word_count":200}],
  "cta": "call to action",
  "estimated_word_count": 1500
}
Raw JSON only. Start {. End }. No markdown.`,
    `SEO content strategist for ${company}.`,
    { temperature: 0.4 }
  )) as any;

  const sections = [];
  for (const section of (outline.sections || []).slice(0, 5)) {
    const content = await llm.prompt(`Write the "${section.heading}" section for: "${outline.title}"

Key points: ${section.key_points?.join(', ')}
Target word count: ${section.word_count || 200}
Tone: ${tone} | Company: ${company}
Research context: ${researchContext.slice(0, 500)}

Write the section content only. Do NOT fabricate statistics.`,
      'Expert content writer.',
      { temperature: 0.6 }
    );
    sections.push({ heading: section.heading, content });
  }

  const [intro, conclusion] = await Promise.all([
    llm.prompt(`Write a compelling introduction (150 words) for: "${outline.title}"\nTone: ${tone}. Do not fabricate statistics.`,
      'Expert content writer.', { temperature: 0.6 }),
    llm.prompt(`Write conclusion (150 words) for: "${outline.title}"\nCTA: ${outline.cta}\nCompany: ${company}`,
      'Expert content writer.', { temperature: 0.6 }),
  ]);

  return {
    type: 'blog_post',
    title: outline.title,
    meta_description: outline.meta_description,
    target_keyword: outline.target_keyword,
    estimated_word_count: outline.estimated_word_count,
    cta: outline.cta,
    content: { introduction: intro, sections, conclusion },
    full_text: [`# ${outline.title}\n`, intro, ...sections.map(s => `## ${s.heading}\n\n${s.content}`), `## Conclusion\n\n${conclusion}`].join('\n\n'),
    generated_at: new Date().toISOString(),
  };
}

async function writeTwitterThread(params: ContentParams): Promise<unknown> {
  const { topic, company, tweets = 12, researchContext = '' } = params;
  const llm = getLLM();

  const result = parseJSON(await llm.prompt(`Viral Twitter/X thread for ${company} on: "${topic}"

RESEARCH DATA:
${researchContext || 'No research data yet.'}

Rules:
- ${tweets} tweets total including hook and CTA
- Each tweet max 280 chars
- Data-backed where possible from research above

JSON:
{
  "hook": "opening tweet — hook",
  "tweets": [{"number":1,"text":"tweet content","char_count":0}],
  "cta_tweet": "final CTA tweet",
  "hook_preview": "first 50 chars of hook"
}
Raw JSON only. Start {. End }. No markdown.`,
    'Viral content writer.',
    { temperature: 0.7 }
  ));

  return { type: 'twitter_thread', topic, company, ...result as any, generated_at: new Date().toISOString() };
}

async function writeLinkedInPost(params: ContentParams): Promise<unknown> {
  const { topic, company, angle, researchContext = '' } = params;
  const llm = getLLM();

  const content = await llm.prompt(`Write a thought leadership LinkedIn post for ${company} on: "${topic}"

ANGLE: ${angle || 'industry insights'}
RESEARCH DATA: ${researchContext.slice(0, 500) || 'No research data.'}

Rules:
- 1300 chars max
- Hook in first line
- Professional tone
- End with question to drive comments
- Do NOT fabricate statistics

Write the post content only.`,
    'LinkedIn content expert.',
    { temperature: 0.6 }
  );

  return {
    type: 'linkedin_post',
    topic, company, angle,
    content, char_count: content.length,
    generated_at: new Date().toISOString(),
  };
}

async function writeRedditPost(params: ContentParams): Promise<unknown> {
  const { topic, company, subreddit = 'SaaS', researchContext = '' } = params;
  const llm = getLLM();

  const result = parseJSON(await llm.prompt(`Write an authentic Reddit post for r/${subreddit} about: "${topic}"

RESEARCH DATA: ${researchContext.slice(0, 400) || 'No research data.'}

Rules:
- Native Reddit tone — no corporate speak
- Value-first, not promotional
- Reference real pain points from research if available

JSON:
{
  "title": "reddit post title",
  "body": "full post body in markdown",
  "subreddit": "${subreddit}",
  "flair": "suggested flair or null"
}
Raw JSON only. Start {. End }. No markdown.`,
    'Reddit community expert. Write in native Reddit style.',
    { temperature: 0.7 }
  ));

  return { type: 'reddit_post', topic, company, subreddit, ...result as any, generated_at: new Date().toISOString() };
}

export async function runContentGeneration(params: ContentParams): Promise<CapabilityResult> {
  const { type, topic, company } = params;
  const mem = getLocalMemory();

  logger.info('[Capability:Content] Starting', { type, topic, company });

  let result: unknown;

  switch (type) {
    case 'blog_post': result = await writeBlogPost(params); break;
    case 'twitter_thread': result = await writeTwitterThread(params); break;
    case 'linkedin_post': result = await writeLinkedInPost(params); break;
    case 'reddit_post': result = await writeRedditPost(params); break;
    default: throw new Error(`Unknown content type: ${type}`);
  }

  mem.set(`content_${type}_${Date.now()}`, {
    type, topic, company, generated_at: new Date().toISOString(),
  });

  logger.info('[Capability:Content] Complete', { type, topic });

  return { capability: 'content', success: true, data: result };
}
