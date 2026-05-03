import { useState, type ReactNode, type ElementType } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Shield, Lock, Database, Copy, ExternalLink, ChevronDown, ChevronUp,
  FlaskConical, Calendar, Clock, Users, TrendingUp, Wallet, Globe,
  AlertTriangle, CheckCircle2, Minus, Zap, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  confidenceBg, formatAddress,
  type NormalizedReport, type CapabilityResult,
  type RedditData, type MarketData, type OnchainData,
  type PainPoint, type Transaction,
} from "@/lib/api";

// ─── Markdown styles ──────────────────────────────────────────────────────────

const mdClass = [
  "prose prose-sm dark:prose-invert max-w-none",
  "prose-headings:text-foreground prose-headings:font-semibold",
  "prose-h1:text-sm prose-h1:mb-2 prose-h2:text-sm prose-h3:text-xs",
  "prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:text-sm prose-p:my-1.5",
  "prose-strong:text-foreground prose-strong:font-semibold",
  "prose-code:text-nexis-green prose-code:bg-nexis-green/10 prose-code:px-1 prose-code:rounded prose-code:text-xs",
  "prose-ul:text-foreground/80 prose-li:text-sm prose-li:my-0.5",
  "prose-hr:border-border prose-hr:my-3",
  "prose-blockquote:border-nexis-green/30 prose-blockquote:text-muted-foreground prose-blockquote:text-xs",
  "prose-a:text-nexis-green prose-a:no-underline hover:prose-a:underline",
  // Table styles
  "prose-table:w-full prose-table:border-collapse prose-table:text-sm",
  "prose-thead:border-b prose-thead:border-border",
  "prose-th:text-left prose-th:px-3 prose-th:py-2 prose-th:text-xs prose-th:font-semibold prose-th:text-foreground/60 prose-th:uppercase prose-th:tracking-wider prose-th:whitespace-nowrap",
  "prose-td:px-3 prose-td:py-2.5 prose-td:text-sm prose-td:text-foreground/85 prose-td:border-b prose-td:border-border/40",
  "prose-tr:transition-colors hover:prose-tr:bg-secondary/30",
].join(" ");

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card border border-card-border rounded-xl p-5", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: {
  icon: ElementType; title: string; badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-nexis-green shrink-0" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {badge && <div className="ml-auto">{badge}</div>}
    </div>
  );
}

function Accordion({ title, count, children, defaultOpen = false, warn = false }: {
  title: string; count?: number; children: ReactNode; defaultOpen?: boolean; warn?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/60 pt-3 mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        }
        <span className={cn("text-xs font-medium", warn ? "text-amber-400" : "text-foreground")}>
          {title}
        </span>
        {count !== undefined && (
          <span className="text-[10px] text-muted-foreground font-mono ml-auto border border-border px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function ConfBadge({ level }: { level?: string }) {
  if (!level) return null;
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest", confidenceBg(level))}>
      {level}
    </span>
  );
}

function Stat({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="bg-secondary/40 rounded-lg px-3 py-2 space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm font-medium text-foreground leading-snug", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-nexis-green" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function HashRow({ label, hash, explorerUrl }: { label: string; hash: string; explorerUrl?: string }) {
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="font-mono text-xs text-foreground/70 flex-1 mx-2 truncate">{short}</span>
      <div className="flex items-center gap-1">
        <CopyButton text={hash} />
        {explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
            className="p-1 rounded text-muted-foreground hover:text-nexis-green transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Card 1: Header ───────────────────────────────────────────────────────────

export function HeaderCard({ report }: { report: NormalizedReport }) {
  const date = report.runAt ? new Date(report.runAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : null;
  const time = report.runAt ? new Date(report.runAt).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  }) : null;
  const durSec = report.durationMs ? Math.round(report.durationMs / 1000) : null;
  const durStr = durSec
    ? durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${durSec}s`
    : null;

  const capColors: Record<string, string> = {
    onchain: "text-blue-400 bg-blue-400/8 border-blue-400/20",
    reddit:  "text-orange-400 bg-orange-400/8 border-orange-400/20",
    market:  "text-purple-400 bg-purple-400/8 border-purple-400/20",
  };

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-nexis-green/10 flex items-center justify-center shrink-0 mt-0.5">
          <FlaskConical className="w-4 h-4 text-nexis-green" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{report.goal}</p>
          {report.taskSummary && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{report.taskSummary}</p>
          )}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />{date} · {time}
              </span>
            )}
            {durStr && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />{durStr}
              </span>
            )}
            <div className="flex gap-1.5 flex-wrap">
              {report.capabilities.map((c) => (
                <span key={c} className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                  capColors[c] ?? "text-muted-foreground bg-secondary border-border"
                )}>{c}</span>
              ))}
            </div>
            {report.sessionId && (
              <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto hidden sm:inline">
                {report.sessionId.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Card 2: Privacy Proof ────────────────────────────────────────────────────

export function PrivacyProofCard({ report }: { report: NormalizedReport }) {
  const checks = [
    { icon: Zap,      label: "Routed via Gensyn AXL",   ok: report.routedViaAXL },
    { icon: Lock,     label: "AES-256 encrypted",        ok: report.encrypted },
    { icon: Database, label: "Stored on 0G network",     ok: !!(report.rootHash || report.txHash) },
  ];

  return (
    <Card className="border-nexis-green/20 bg-nexis-green/[0.02]">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-nexis-green shrink-0" />
        <h2 className="text-sm font-semibold text-foreground">Privacy Proof</h2>
        <span className="ml-auto text-[10px] font-bold tracking-widest text-nexis-green/60 uppercase">
          Private Session
        </span>
      </div>

      <div className="space-y-1.5 mb-4">
        {checks.map(({ icon: Icon, label, ok }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground/70 flex-1">{label}</span>
            {ok
              ? <CheckCircle2 className="w-3.5 h-3.5 text-nexis-green shrink-0" />
              : <Minus className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            }
          </div>
        ))}
      </div>

      {(report.rootHash || report.txHash) && (
        <div className="bg-secondary/40 rounded-lg px-3 py-1 divide-y divide-border/40">
          {report.rootHash && (
            <HashRow label="Root" hash={report.rootHash} />
          )}
          {report.txHash && (
            <HashRow
              label="Tx"
              hash={report.txHash}
              explorerUrl={`https://etherscan.io/tx/${report.txHash}`}
            />
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Card 3: Executive Summary ────────────────────────────────────────────────

export function SummaryCard({ summary }: { summary: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-nexis-green shrink-0" />
        <h2 className="text-sm font-semibold text-foreground">Intelligence Report</h2>
      </div>
      <div className={mdClass}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
      </div>
    </Card>
  );
}

// ─── Card 4: Community Intelligence (reddit capability) ──────────────────────

export function CommunityCard({ result }: { result: CapabilityResult }) {
  const d = result.data as RedditData;
  const r = d.report;
  const s = d.stats;
  const dq = r.data_quality;

  const sourceBreak = Object.entries(d.stats?.source_breakdown ?? {});

  return (
    <Card>
      <SectionHeader
        icon={Users}
        title="Community Intelligence"
        badge={
          <div className="flex items-center gap-2">
            {result.duration_ms && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {(result.duration_ms / 1000).toFixed(0)}s
              </span>
            )}
          </div>
        }
      />

      {/* Source stats */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs text-muted-foreground font-mono">{s?.total_items ?? 0} items</span>
        {sourceBreak.map(([src, n]) => (
          <span key={src} className="text-[10px] font-mono text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded">
            {src}:{n}
          </span>
        ))}
        {d.domain && (
          <span className="text-[10px] text-muted-foreground/50 font-mono">{d.domain}</span>
        )}
      </div>

      {/* Extraction warning */}
      {dq?.extraction_failure_suspected && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-400">Extraction gap detected</p>
            {dq.expected_but_missing && dq.expected_but_missing.length > 0 && (
              <p className="text-[11px] text-amber-400/70 mt-1 leading-relaxed">
                Missing: {dq.expected_but_missing.slice(0, 4).join(", ")}
                {dq.expected_but_missing.length > 4 && ` +${dq.expected_but_missing.length - 4} more`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirmed pain points */}
      <Accordion title="Confirmed Pain Points" count={r.confirmed_pain_points?.length ?? 0} defaultOpen={false}>
        {(r.confirmed_pain_points ?? []).length === 0
          ? <p className="text-xs text-muted-foreground italic">None identified</p>
          : (r.confirmed_pain_points ?? []).map((p, i) => (
            <SignalItem key={i} signal={p} />
          ))
        }
      </Accordion>

      {/* Strong signals */}
      <Accordion title="Strong Signals" count={r.strong_signals?.length ?? 0} defaultOpen={(r.strong_signals?.length ?? 0) > 0}>
        {(r.strong_signals ?? []).map((p, i) => (
          <SignalItem key={i} signal={p} />
        ))}
      </Accordion>

      {/* Weak signals */}
      <Accordion title="Weak Signals" count={r.weak_signals?.length ?? 0}>
        {(r.weak_signals ?? []).map((p, i) => (
          <div key={i} className="bg-secondary/30 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">{p.pain}</p>
            {p.note && <p className="text-[11px] text-muted-foreground leading-relaxed">{p.note}</p>}
            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border inline-block mt-1",
              p.validation_status?.includes("WEAK")
                ? "text-amber-400/70 bg-amber-400/5 border-amber-400/15"
                : "text-muted-foreground bg-secondary border-border"
            )}>{p.validation_status}</span>
          </div>
        ))}
      </Accordion>

      {/* Layer analysis */}
      {r.layer_analysis && (
        <Accordion title="Layer Analysis">
          <div className="space-y-2">
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Behavioral</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{r.layer_analysis.behavioral_summary}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Technical</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{r.layer_analysis.technical_summary}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Dominant layer:</span>
              <span className="text-[10px] font-mono text-nexis-green">{r.layer_analysis.dominant_layer}</span>
            </div>
          </div>
        </Accordion>
      )}

      {/* Signal type breakdown */}
      {r.signal_type_breakdown && Object.keys(r.signal_type_breakdown).length > 0 && (
        <Accordion title="Signal Type Breakdown">
          <div className="space-y-2">
            {Object.entries(r.signal_type_breakdown).map(([k, v]) => (
              <div key={k} className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 capitalize">{k}</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Cross-source insights */}
      {r.cross_source_insights && (
        <Accordion title="Cross-Source Insights">
          <p className="text-xs text-foreground/80 leading-relaxed">{r.cross_source_insights}</p>
        </Accordion>
      )}

      {/* What we can't tell */}
      {r.what_data_cannot_tell_us && (
        <Accordion title="Data Limitations" warn>
          <p className="text-xs text-foreground/70 leading-relaxed">{r.what_data_cannot_tell_us}</p>
        </Accordion>
      )}
    </Card>
  );
}

function SignalItem({ signal }: { signal: PainPoint }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-foreground leading-snug">{signal.pain}</p>
        {signal.validation_status && (
          <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0",
            signal.validation_status.includes("STRONG")
              ? "text-nexis-green bg-nexis-green/5 border-nexis-green/20"
              : signal.validation_status.includes("CONFIRMED")
              ? "text-blue-400 bg-blue-400/5 border-blue-400/20"
              : "text-muted-foreground bg-secondary border-border"
          )}>{signal.validation_status.replace("_SIGNAL", "").replace("_", " ")}</span>
        )}
      </div>
      {signal.evidence_quote && (
        <p className="text-[11px] text-muted-foreground italic border-l-2 border-nexis-green/20 pl-2 leading-relaxed">
          "{signal.evidence_quote.slice(0, 200)}{signal.evidence_quote.length > 200 ? "…" : ""}"
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        {signal.type && (
          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">{signal.type}</span>
        )}
        {signal.frequency !== undefined && (
          <span className="text-[10px] text-muted-foreground font-mono">freq:{signal.frequency}</span>
        )}
        {signal.total_upvotes !== undefined && (
          <span className="text-[10px] text-muted-foreground font-mono">↑{signal.total_upvotes}</span>
        )}
        {signal.layer && (
          <span className="text-[10px] font-mono text-muted-foreground/50 capitalize">{signal.layer}</span>
        )}
      </div>
      {signal.note && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed border-t border-border/40 pt-1.5">
          {signal.note}
        </p>
      )}
    </div>
  );
}

// ─── Card 5: Market Intelligence ──────────────────────────────────────────────

export function MarketCard({ result }: { result: CapabilityResult }) {
  const d = result.data as MarketData;
  const es = d.executive_summary;

  return (
    <Card>
      <SectionHeader
        icon={TrendingUp}
        title="Market Intelligence"
        badge={
          <div className="flex items-center gap-2">
            <ConfBadge level={es?.overall_confidence} />
            {result.duration_ms && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {(result.duration_ms / 1000).toFixed(0)}s
              </span>
            )}
          </div>
        }
      />

      {/* Market summary */}
      {es?.market_summary && (
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">{es.market_summary}</p>
      )}

      {/* Biggest opportunity */}
      {es?.biggest_opportunity && (
        <div className="bg-nexis-green/5 border border-nexis-green/20 rounded-lg p-3 mb-3">
          <p className="text-[10px] text-nexis-green uppercase tracking-wider mb-1 font-medium">
            Biggest Opportunity
          </p>
          <p className="text-xs text-foreground/90 leading-relaxed">{es.biggest_opportunity}</p>
        </div>
      )}

      {/* One thing */}
      {es?.one_thing && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-1">
          <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1 font-medium">
            One action to take
          </p>
          <p className="text-xs text-foreground/90 leading-relaxed">{es.one_thing}</p>
        </div>
      )}

      {/* Top 3 Insights */}
      {es?.top3_insights?.length > 0 && (
        <Accordion title="Top Insights" count={es.top3_insights.length} defaultOpen>
          <div className="space-y-2">
            {es.top3_insights.map((ins, i) => (
              <div key={i} className="bg-secondary/30 rounded-lg p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground/50 mt-0.5 w-4 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{ins.insight}</p>
                    {ins.evidence && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{ins.evidence}</p>
                    )}
                    {ins.action && (
                      <p className="text-[11px] text-nexis-green/70 mt-1">→ {ins.action}</p>
                    )}
                  </div>
                  <ConfBadge level={ins.confidence} />
                </div>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* GTM recommendation */}
      {es?.go_to_market_recommendation && (
        <Accordion title="Go-to-Market Recommendation">
          <p className="text-xs text-foreground/80 leading-relaxed">{es.go_to_market_recommendation}</p>
        </Accordion>
      )}

      {/* Reality check */}
      {es?.reality_check && (
        <Accordion title="Reality Check" warn>
          <div className="space-y-2">
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">What we don't know</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{es.reality_check.what_we_dont_know}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Alternative interpretation</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{es.reality_check.alternative_interpretation}</p>
            </div>
          </div>
        </Accordion>
      )}

      {/* Feature matrix */}
      {d.feature_matrix && (
        <Accordion title="Feature Matrix">
          <div className="space-y-3">
            {d.feature_matrix.common_features?.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Common Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.feature_matrix.common_features.map((f, i) => (
                    <span key={i} className="text-[10px] text-foreground/70 bg-secondary border border-border px-2 py-0.5 rounded font-mono">
                      {f.feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {d.feature_matrix.feature_gaps?.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Feature Gaps</p>
                <div className="space-y-1">
                  {d.feature_matrix.feature_gaps.map((g, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 text-xs">·</span>
                      <p className="text-xs text-foreground/70 flex-1">{g.gap}</p>
                      <ConfBadge level={g.confidence} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Accordion>
      )}

      {/* Competitor reviews */}
      {d.review_analysis && d.review_analysis.length > 0 && (
        <Accordion title="Competitor Analysis" count={d.review_analysis.length}>
          <div className="space-y-1.5">
            {d.review_analysis.map((c, i) => {
              const a = c.analysis as Record<string, unknown>;
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs font-medium text-foreground">{c.competitor}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">{c.reddit_posts} posts</span>
                    <ConfBadge level={a?.confidence as string} />
                  </div>
                </div>
              );
            })}
          </div>
        </Accordion>
      )}

      {/* HN signals */}
      {(d.market_signals?.hacker_news ?? []).length > 0 && (
        <Accordion title="Hacker News Signals" count={d.market_signals!.hacker_news.length}>
          <div className="space-y-2">
            {d.market_signals!.hacker_news.map((hn, i) => (
              <div key={i} className="bg-secondary/30 rounded-lg p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{hn.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">↑{hn.points}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{hn.comments} comments</span>
                  </div>
                </div>
                {hn.hn_url && (
                  <a href={hn.hn_url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-nexis-green transition-colors shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Accordion>
      )}
    </Card>
  );
}

// ─── Card 6: Onchain Profile ──────────────────────────────────────────────────

export function OnchainCard({ result }: { result: CapabilityResult }) {
  const d = result.data as OnchainData;
  const p = d.profile;
  const [showAllTx, setShowAllTx] = useState(false);
  const txs: Transaction[] = p?.recent_txs ?? [];
  const visibleTxs = showAllTx ? txs : txs.slice(0, 5);

  function methodColor(method: string) {
    if (method.toLowerCase().includes("swap")) return "text-blue-400 bg-blue-400/8 border-blue-400/20";
    if (method.toLowerCase().includes("approve")) return "text-amber-400 bg-amber-400/8 border-amber-400/20";
    if (method.toLowerCase() === "transfer") return "text-nexis-green/70 bg-nexis-green/5 border-nexis-green/15";
    return "text-muted-foreground bg-secondary border-border";
  }

  return (
    <Card>
      <SectionHeader
        icon={Wallet}
        title="Wallet Intelligence"
        badge={
          <div className="flex items-center gap-2">
            {d.privacy?.routed_via_axl && (
              <span className="text-[10px] text-nexis-green font-mono border border-nexis-green/20 bg-nexis-green/5 px-1.5 py-0.5 rounded">AXL</span>
            )}
            {result.duration_ms && (
              <span className="text-[10px] text-muted-foreground font-mono">{(result.duration_ms / 1000).toFixed(0)}s</span>
            )}
          </div>
        }
      />

      {/* Address */}
      <div className="flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded-lg mb-4 w-fit">
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono text-sm text-foreground">{d.address}</span>
        <CopyButton text={d.address} />
        <a href={`https://etherscan.io/address/${d.address}`} target="_blank" rel="noopener noreferrer"
          className="text-muted-foreground hover:text-nexis-green transition-colors">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Chains */}
      {d.chains_analyzed?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {d.chains_analyzed.map((c) => (
            <span key={c} className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded capitalize">{c}</span>
          ))}
        </div>
      )}

      {/* Profile stats */}
      {p && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          <Stat label="Wallet Type" value={p.wallet_type ?? "—"} />
          <Stat label="Activity" value={p.activity_level ?? "—"} />
          <Stat label="Total Value" value={p.total_usd ? `$${p.total_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} mono />
          <Stat label="Transactions" value={p.tx_count ?? "—"} mono />
          <Stat label="First Seen" value={p.first_seen ? new Date(p.first_seen).toLocaleDateString() : "—"} />
          <Stat label="Last Active" value={p.last_active ? new Date(p.last_active).toLocaleDateString() : "—"} />
        </div>
      )}

      {/* Balances */}
      {p?.balances?.length > 0 && (
        <Accordion title="Chain Balances" count={p.balances.length} defaultOpen>
          <div className="space-y-1.5">
            {p.balances.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono capitalize w-16">{b.chain}</span>
                  <span className="text-xs font-mono text-foreground">{b.nativeBalance.toFixed(4)} {b.nativeSymbol}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">${(b.usdValue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Recent transactions */}
      {txs.length > 0 && (
        <Accordion title="Recent Transactions" count={txs.length} defaultOpen>
          <div className="space-y-1.5">
            {visibleTxs.map((tx, i) => (
              <div key={i} className="bg-secondary/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0", methodColor(tx.method))}>
                  {tx.method.slice(0, 18)}
                </span>
                <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] font-mono text-muted-foreground hover:text-nexis-green transition-colors flex-1 truncate">
                  {formatAddress(tx.hash)}
                </a>
                {tx.valueUSD != null && (
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    ${tx.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
                <span className="text-[10px] font-mono text-muted-foreground/40 capitalize shrink-0 hidden sm:inline">{tx.chain}</span>
              </div>
            ))}
            {txs.length > 5 && (
              <button onClick={() => setShowAllTx(!showAllTx)}
                className="text-xs text-nexis-green hover:text-nexis-green/80 transition-colors w-full text-center py-1">
                {showAllTx ? "Show less" : `Show all ${txs.length} transactions`}
              </button>
            )}
          </div>
        </Accordion>
      )}

      {/* Top tokens */}
      {p?.top_tokens?.length > 0 && (
        <Accordion title="Token Holdings" count={p.top_tokens.length}>
          <div className="space-y-1.5">
            {p.top_tokens.slice(0, 8).map((t, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                <span className="text-xs font-mono text-foreground">{t.symbol}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {t.usdValue ? `$${t.usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Analysis */}
      {d.analysis && (
        <Accordion title="Detailed Analysis" defaultOpen={false}>
          <div className={mdClass}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.analysis}</ReactMarkdown>
          </div>
        </Accordion>
      )}
    </Card>
  );
}

// ─── Card 7: Raw JSON ─────────────────────────────────────────────────────────

export function RawJsonCard({ report }: { report: NormalizedReport }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(report, null, 2);

  return (
    <Card className="opacity-70 hover:opacity-100 transition-opacity">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left">
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground">Raw Response</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/40">
          {(JSON.stringify(report).length / 1024).toFixed(1)} KB
        </span>
        {open && (
          <button
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground ml-2 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3 h-3 text-nexis-green" /> : <Copy className="w-3 h-3" />}
            copy
          </button>
        )}
      </button>
      {open && (
        <pre className="mt-3 text-[10px] font-mono text-muted-foreground/70 overflow-x-auto bg-black/30 rounded-lg p-3 max-h-80 overflow-y-auto leading-relaxed">
          {json}
        </pre>
      )}
    </Card>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ResearchReport({ report }: { report: NormalizedReport }) {
  const communityResult = report.results.find((r) => r.capability === "reddit" && r.success);
  const marketResult    = report.results.find((r) => r.capability === "market"  && r.success);
  const onchainResult   = report.results.find((r) => r.capability === "onchain" && r.success);

  return (
    <div className="space-y-4">
      <HeaderCard report={report} />
      {(report.rootHash || report.txHash) && <PrivacyProofCard report={report} />}
      {report.summary && <SummaryCard summary={report.summary} />}
      {onchainResult  && <OnchainCard   result={onchainResult}   />}
      {communityResult && <CommunityCard result={communityResult} />}
      {marketResult   && <MarketCard    result={marketResult}    />}
      <RawJsonCard report={report} />
    </div>
  );
}
