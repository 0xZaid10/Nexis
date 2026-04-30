import { getRouter } from '../privacy/router.js';
import { logger } from '../utils/logger.js';

// ─── GitHub Service ───────────────────────────────────────────────────────────
// GitHub public API — no key needed for public repos
// Searches issues, discussions, and repos
// ALL requests routed through AXL privacy layer

const BASE_URL = 'https://api.github.com';
const HEADERS = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'Nexis-Research-Agent/1.0',
};

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  comments: number;
  reactions_total: number;
  url: string;
  repo: string;
  created_at: string;
  labels: string[];
  source: 'github';
  engagement: number;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  stars: number;
  forks: number;
  open_issues: number;
  url: string;
  topics: string[];
  source: 'github';
}

// ─── Search issues across GitHub ─────────────────────────────────────────────

export async function searchIssues(
  query: string,
  repos: string[] = [],
  maxResults = 50
): Promise<GitHubIssue[]> {
  const router = getRouter();

  // Build query — search in specific repos if provided
  const repoFilter = repos.map(r => `repo:${r}`).join(' ');
  const fullQuery = repoFilter
    ? `${query} ${repoFilter} is:issue`
    : `${query} is:issue`;

  const params = new URLSearchParams({
    q: fullQuery,
    sort: 'reactions',
    order: 'desc',
    per_page: Math.min(maxResults, 100).toString(),
  });

  logger.info('[GitHub] Searching issues', { query: fullQuery.slice(0, 80) });

  try {
    const res = await router.get(
      `${BASE_URL}/search/issues?${params.toString()}`,
      HEADERS
    );

    const data = res.data as any;
    if (!data?.items?.length) return [];

    return data.items.map((item: any) => ({
      id: item.id,
      number: item.number,
      title: item.title || '',
      body: (item.body || '').slice(0, 500),
      state: item.state || 'open',
      comments: item.comments || 0,
      reactions_total: item.reactions?.total_count || 0,
      url: item.html_url || '',
      repo: item.repository_url?.split('/').slice(-2).join('/') || '',
      created_at: item.created_at || '',
      labels: (item.labels || []).map((l: any) => l.name),
      source: 'github' as const,
      engagement: (item.reactions?.total_count || 0) + (item.comments || 0) * 2,
    }));

  } catch (err) {
    logger.error('[GitHub] Issue search failed', { error: (err as Error).message });
    return [];
  }
}

// ─── Search repositories ──────────────────────────────────────────────────────

export async function searchRepos(
  query: string,
  maxResults = 10
): Promise<GitHubRepo[]> {
  const router = getRouter();

  const params = new URLSearchParams({
    q: query,
    sort: 'stars',
    order: 'desc',
    per_page: Math.min(maxResults, 30).toString(),
  });

  try {
    const res = await router.get(
      `${BASE_URL}/search/repositories?${params.toString()}`,
      HEADERS
    );

    const data = res.data as any;
    if (!data?.items?.length) return [];

    return data.items.map((repo: any) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      open_issues: repo.open_issues_count || 0,
      url: repo.html_url,
      topics: repo.topics || [],
      source: 'github' as const,
    }));

  } catch (err) {
    logger.error('[GitHub] Repo search failed', { error: (err as Error).message });
    return [];
  }
}

// ─── Get issues from specific repos ──────────────────────────────────────────

export async function getRepoIssues(
  repoFullName: string,
  maxResults = 30
): Promise<GitHubIssue[]> {
  const router = getRouter();

  const params = new URLSearchParams({
    state: 'open',
    sort: 'reactions',
    direction: 'desc',
    per_page: Math.min(maxResults, 100).toString(),
  });

  try {
    const res = await router.get(
      `${BASE_URL}/repos/${repoFullName}/issues?${params.toString()}`,
      HEADERS
    );

    const data = res.data as any;
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: item.id,
      number: item.number,
      title: item.title || '',
      body: (item.body || '').slice(0, 500),
      state: item.state || 'open',
      comments: item.comments || 0,
      reactions_total: item.reactions?.total_count || 0,
      url: item.html_url || '',
      repo: repoFullName,
      created_at: item.created_at || '',
      labels: (item.labels || []).map((l: any) => l.name),
      source: 'github' as const,
      engagement: (item.reactions?.total_count || 0) + (item.comments || 0) * 2,
    }));

  } catch (err) {
    logger.error('[GitHub] Repo issues failed', { repo: repoFullName, error: (err as Error).message });
    return [];
  }
}

// ─── Format for LLM ──────────────────────────────────────────────────────────

export function formatIssues(issues: GitHubIssue[]): string {
  return issues.slice(0, 20).map((issue, i) =>
    `[${i + 1}] ${issue.repo}#${issue.number} (👍${issue.reactions_total} 💬${issue.comments}) | ${issue.title} | ${issue.body.slice(0, 150)}`
  ).join('\n');
}
