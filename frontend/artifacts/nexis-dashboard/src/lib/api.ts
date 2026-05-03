export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api/nexis";

// ─── Real API Types (from actual agent output) ────────────────────────────────

export interface NexisSession {
  success?: boolean;
  sessionId: string;
  userId?: string;
  goal: string;
  run_at: string;
  plan?: {
    task_summary: string;
    output_type: string;
    capabilities_run: string[];
  };
  summary?: string;
  results?: CapabilityResult[];
  storage?: StorageProof;
  routedViaAXL?: boolean;
  duration_ms?: number;
  // Session-wrapper shape (GET /session/:id may return this)
  session?: {
    id: string;
    userId: string;
    goal: string;
    status: string;
    createdAt: string;
    completedAt: string;
    summary: string;
    rootHash: string;
    txHash: string;
    hasDecentralizedStorage: boolean;
  };
}

export interface StorageProof {
  rootHash: string;
  txHash: string;
  encrypted: boolean;
}

export interface CapabilityResult {
  capability: "onchain" | "reddit" | "market" | string;
  success: boolean;
  data: OnchainData | RedditData | MarketData | Record<string, unknown>;
  duration_ms?: number;
}

// ── Onchain ──────────────────────────────────────────────────────────────────

export interface OnchainData {
  type: "wallet_intelligence";
  address: string;
  chains_analyzed: string[];
  run_at: string;
  profile: WalletProfile;
  analysis?: string;
  privacy?: OnchainPrivacy;
}

export interface WalletProfile {
  wallet_type: string;
  activity_level: string;
  total_usd: number;
  tx_count: number;
  first_seen: string;
  last_active: string;
  protocols: string[];
  funding_sources: string[];
  balances: ChainBalance[];
  top_tokens: TopToken[];
  recent_txs: Transaction[];
}

export interface ChainBalance {
  chain: string;
  nativeBalance: number;
  nativeSymbol: string;
  usdValue: number;
}

export interface TopToken {
  symbol: string;
  name?: string;
  balance?: string | number;
  usdValue?: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUSD: number | null;
  timestamp: string;
  method: string;
  status: string;
  chain: string;
}

export interface OnchainPrivacy {
  routed_via_axl: boolean;
  no_identity_exposed: boolean;
  chains_queried: string[];
}

// ── Reddit / Community Research ───────────────────────────────────────────────

export interface RedditData {
  type: "community_research";
  topic: string;
  company: string;
  domain: string;
  run_at: string;
  stats: CommunityStats;
  report: CommunityReport;
}

export interface CommunityStats {
  total_items: number;
  source_breakdown: Record<string, number>;
  confirmed_pains: number;
  strong_signals: number;
  weak_signals: number;
  behavioral_pains: number;
  technical_pains: number;
}

export interface CommunityReport {
  executive_summary: string;
  data_quality?: {
    behavioral_extraction?: string;
    technical_extraction?: string;
    extraction_failure_suspected?: boolean;
    expected_but_missing?: string[];
  };
  total_items_analyzed: number;
  sources_used: string[];
  confirmed_pain_points: PainPoint[];
  strong_signals: PainPoint[];
  weak_signals: WeakSignal[];
  layer_analysis?: {
    behavioral_summary: string;
    technical_summary: string;
    dominant_layer: string;
  };
  cross_source_insights?: string;
  what_data_cannot_tell_us?: string;
  signal_type_breakdown?: Record<string, string>;
}

export interface PainPoint {
  rank?: number;
  pain: string;
  layer?: string;
  type?: string;
  scope?: string;
  severity?: string;
  frequency?: number;
  confidence?: string;
  total_upvotes?: number;
  evidence_quote?: string;
  opportunity?: string;
  validation_status?: string;
  note?: string;
}

export interface WeakSignal {
  pain: string;
  validation_status: string;
  note: string;
}

// ── Market Research ───────────────────────────────────────────────────────────

export interface MarketData {
  type: "market_research";
  company: string;
  topic: string;
  run_at: string;
  executive_summary: MarketExecSummary;
  pricing_landscape?: Record<string, unknown>;
  feature_matrix?: FeatureMatrix;
  review_analysis?: CompetitorReview[];
  market_signals?: MarketSignals;
}

export interface MarketExecSummary {
  market_summary: string;
  biggest_opportunity: string;
  recommended_positioning?: string;
  top3_insights: MarketInsight[];
  go_to_market_recommendation?: string;
  reality_check?: { what_we_dont_know: string; alternative_interpretation: string };
  one_thing?: string;
  overall_confidence: string;
}

export interface MarketInsight {
  insight: string;
  evidence: string;
  confidence: string;
  action: string;
}

export interface FeatureMatrix {
  common_features: { feature: string; data_basis: string }[];
  differentiating_features: { feature: string; has: string[]; missing: string[] }[];
  feature_gaps: { gap: string; confidence: string }[];
  our_advantages: { advantage: string; confidence: string }[];
  our_gaps: { gap: string; confidence: string }[];
}

export interface CompetitorReview {
  competitor: string;
  reddit_posts: number;
  analysis: Record<string, unknown>;
}

export interface MarketSignals {
  hacker_news: HNPost[];
  product_hunt: unknown[];
  analysis?: Record<string, unknown>;
}

export interface HNPost {
  title: string;
  url: string;
  points: number;
  comments: number;
  hn_url: string;
  source: string;
}

// ─── Normalized Report (handles all response shapes) ─────────────────────────

export interface NormalizedReport {
  sessionId: string;
  goal: string;
  runAt: string;
  durationMs?: number;
  capabilities: string[];
  taskSummary?: string;
  summary?: string;
  results: CapabilityResult[];
  rootHash?: string;
  txHash?: string;
  routedViaAXL: boolean;
  encrypted: boolean;
}

/** Normalize both flat sync response and session-wrapper shape into one type */
export function normalizeReport(raw: Record<string, unknown>): NormalizedReport {
  const sess = (raw.session ?? {}) as Record<string, unknown>;
  const plan = (raw.plan ?? {}) as { capabilities_run?: string[]; task_summary?: string };
  const storage = (raw.storage ?? {}) as { rootHash?: string; txHash?: string; encrypted?: boolean };
  const results = (raw.results ?? []) as CapabilityResult[];

  const sessionId = (raw.sessionId ?? sess.id ?? "") as string;
  const goal      = (raw.goal ?? sess.goal ?? "") as string;
  const runAt     = (raw.run_at ?? sess.createdAt ?? "") as string;
  const summary   = (raw.summary ?? sess.summary ?? "") as string;
  const rootHash  = storage.rootHash ?? (raw.rootHash as string) ?? (sess.rootHash as string);
  const txHash    = storage.txHash   ?? (raw.txHash as string)   ?? (sess.txHash as string);
  const routedViaAXL = !!(raw.routedViaAXL ?? false);
  const encrypted    = !!(storage.encrypted ?? sess.hasDecentralizedStorage ?? false);
  const durationMs   = (raw.duration_ms as number) ?? undefined;

  const capabilities: string[] = plan.capabilities_run?.length
    ? plan.capabilities_run
    : results.map((r) => r.capability).filter(Boolean);

  return {
    sessionId, goal, runAt, durationMs, capabilities,
    taskSummary: plan.task_summary,
    summary: summary || undefined,
    results, rootHash, txHash, routedViaAXL, encrypted,
  };
}

// ─── Legacy type alias ────────────────────────────────────────────────────────
export type ResearchSession = NexisSession;

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  let json: unknown;
  try { json = await res.json(); } catch { json = {}; }

  const j = json as Record<string, unknown>;
  if (!res.ok || j["success"] === false) {
    const msg = (j["error"] as string) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

// ─── Research ─────────────────────────────────────────────────────────────────

/** Normalize a raw session object — handles both flat and session-wrapper shapes */
function normalizeSession(raw: Record<string, unknown>): NexisSession {
  // Wrapper shape: { success, session: { id, ... } }
  if (raw.session && typeof raw.session === "object") {
    const s = raw.session as Record<string, unknown>;
    return {
      ...(s as NexisSession),
      sessionId: (s.sessionId ?? s.id ?? "") as string,
      run_at: (s.run_at ?? s.createdAt ?? "") as string,
    };
  }
  // Flat shape: { sessionId | id, ... }
  return {
    ...(raw as NexisSession),
    sessionId: (raw.sessionId ?? raw.id ?? "") as string,
    run_at: (raw.run_at ?? raw.createdAt ?? "") as string,
  };
}

export async function getSession(sessionId: string): Promise<NexisSession> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/research/session/${sessionId}`);
  return normalizeSession(raw);
}

export async function getSessions(userId: string): Promise<NexisSession[]> {
  const result = await apiFetch<NexisSession[] | { sessions?: NexisSession[] }>(
    `/api/research/sessions/${encodeURIComponent(userId)}`,
  );
  const arr: NexisSession[] = Array.isArray(result)
    ? result
    : (result as { sessions?: NexisSession[] }).sessions ?? [];
  // Normalize each session so sessionId is always populated
  return arr.map((s) => normalizeSession(s as unknown as Record<string, unknown>));
}

// ─── KeeperHub ────────────────────────────────────────────────────────────────

export interface KeeperNode {
  id: string;
  address: string;
  status: "active" | "inactive" | "slashed";
  stake?: string;
  uptime?: number;
  last_seen?: string;
  chain?: string;
  rewards?: string;
}

export interface Workflow {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdAt: string;
}

export type WorkflowType = "whale" | "scheduled" | "defi" | "price_alert" | "custom";

export function getWorkflowType(name: string): WorkflowType {
  if (name.toLowerCase().includes("whale"))     return "whale";
  if (name.toLowerCase().includes("scheduled")) return "scheduled";
  if (name.toLowerCase().includes("defi"))      return "defi";
  if (name.toLowerCase().includes("price"))     return "price_alert";
  return "custom";
}

export async function getWorkflows(): Promise<Workflow[]> {
  try {
    const result = await apiFetch<{ data?: { workflows?: Workflow[] }; workflows?: Workflow[] }>("/api/keeper/workflows");
    const workflows = (result as { data?: { workflows?: Workflow[] } }).data?.workflows
      ?? (result as { workflows?: Workflow[] }).workflows
      ?? [];
    return workflows as Workflow[];
  } catch {
    return [];
  }
}

export async function simulateWorkflowTrigger(workflow: Workflow): Promise<{ success: boolean; message?: string; goal?: string }> {
  const type = getWorkflowType(workflow.name);
  const addressMatch = workflow.name.match(/0x[a-fA-F0-9]+/);
  const address = addressMatch?.[0];

  const payloads: Record<string, unknown> = {
    whale: { type: "whale_movement", address: address ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", threshold_eth: 5, userId: "keeper-auto" },
    scheduled: { type: "scheduled_research", goal: "Research DeFi privacy tools market", userId: "keeper-scheduled" },
    defi: { type: "defi_monitor", contractAddress: address ?? "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9", protocol: "Aave", userId: "keeper-auto" },
    price_alert: { type: "scheduled_research", goal: "Research ETH price movement and market sentiment", userId: "keeper-auto" },
    custom: { type: "scheduled_research", goal: "Research DeFi privacy tools market", userId: "keeper-auto" },
  };

  return apiFetch("/api/keeper/webhook", { method: "POST", body: JSON.stringify(payloads[type] ?? payloads.scheduled) }) as Promise<{ success: boolean; message?: string; goal?: string }>;
}

export async function createKeeperMonitor(data: unknown): Promise<unknown> {
  return apiFetch("/api/keeper/create-monitor", { method: "POST", body: JSON.stringify(data) });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function confidenceColor(level?: string): string {
  switch (level?.toUpperCase()) {
    case "HIGH":   return "text-nexis-green";
    case "MEDIUM": return "text-amber-400";
    case "LOW":    return "text-orange-400";
    default:       return "text-muted-foreground";
  }
}

export function confidenceBg(level?: string): string {
  switch (level?.toUpperCase()) {
    case "HIGH":   return "bg-nexis-green/10 text-nexis-green border-nexis-green/20";
    case "MEDIUM": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "LOW":    return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "NONE":   return "bg-red-500/10 text-red-400 border-red-500/20";
    default:       return "bg-secondary text-muted-foreground border-border";
  }
}

export function severityBg(level?: string): string {
  switch (level?.toUpperCase()) {
    case "HIGH":   return "bg-red-500/10 text-red-400 border-red-500/20";
    case "MEDIUM": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "LOW":    return "bg-nexis-green/10 text-nexis-green border-nexis-green/20";
    default:       return "bg-secondary text-muted-foreground border-border";
  }
}

export function riskBg(level?: string): string { return severityBg(level); }
export function riskColor(level?: string): string { return confidenceColor(level); }
