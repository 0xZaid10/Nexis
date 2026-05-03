import { useState, useRef } from "react";
import { useUser } from "@clerk/react";
import {
  Link2, Search, Loader2, AlertCircle, Hash,
  CheckCircle2, RotateCcw,
} from "lucide-react";
import { API_BASE, formatAddress, normalizeReport, type NormalizedReport } from "@/lib/api";
import { ResearchReport } from "@/components/research/ResearchReport";
import { cn } from "@/lib/utils";

const EXAMPLE_ADDRESSES = [
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "0x49CAdA74991C0090AF0be3FD387B17f1Da9d903D",
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
];

type Phase = "idle" | "running" | "done" | "error";

export default function Onchain() {
  const { user } = useUser();

  const [address, setAddress]   = useState("");
  const [phase, setPhase]       = useState<Phase>("idle");
  const [error, setError]       = useState("");
  const [report, setReport]     = useState<NormalizedReport | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  function cancelRequest() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const addr = address.trim();
    if (!addr || phase === "running") return;

    cancelRequest();
    setPhase("running");
    setError("");
    setReport(null);

    const userId = user?.id ?? "anonymous";
    const goal = `Analyze this wallet address and provide a full intelligence report including trader profile, balances, recent transactions, and risk assessment: ${addr}`;

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    try {
      const res = await fetch(`${API_BASE}/api/research/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, userId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const raw = await res.json() as Record<string, unknown>;

      if (!res.ok || raw.success === false) {
        throw new Error((raw.error as string) ?? (raw.message as string) ?? `HTTP ${res.status}`);
      }

      const normalized = normalizeReport(raw);
      if (!normalized.sessionId) throw new Error("No sessionId in response");

      setReport(normalized);
      setPhase("done");
    } catch (err) {
      clearTimeout(timeoutId);
      cancelRequest();
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const msg = isAbort
        ? "Request timed out. Check Sessions — analysis may still be running."
        : (err instanceof Error ? err.message : "Analysis failed");
      setError(msg);
      setPhase("error");
    }
  }

  function reset() {
    cancelRequest();
    setPhase("idle");
    setError("");
    setReport(null);
    setAddress("");
  }

  const isRunning = phase === "running";

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      {phase === "done" ? (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <CheckCircle2 className="w-4 h-4 text-nexis-green" />
            <span>Analysis complete</span>
            <span className="font-mono text-foreground/35 hidden sm:inline">· {address.slice(0, 10)}…{address.slice(-6)}</span>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground border border-border bg-card hover:bg-secondary px-3 py-1.5 rounded-lg transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            New Analysis
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Link2 className="w-5 h-5 text-foreground/50" />
            <h1 className="text-xl font-semibold text-foreground">Onchain</h1>
          </div>
          <p className="text-base text-foreground/65">
            Deep wallet and contract intelligence — trader profile, transactions, risk flags, and multi-chain balances.
          </p>
        </div>
      )}

      {/* ── Search form ────────────────────────────────────────────────── */}
      {phase !== "done" && (
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Wallet or contract address (0x…)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isRunning}
                className={cn(
                  "w-full bg-card border border-card-border rounded-xl pl-11 pr-4 py-3 text-base font-mono text-foreground",
                  "placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-nexis-green/20 focus:border-nexis-green/40 transition-all",
                  isRunning && "opacity-60 cursor-not-allowed"
                )}
              />
            </div>
            <button
              type={phase === "error" ? "button" : "submit"}
              onClick={phase === "error" ? reset : undefined}
              disabled={(!address.trim() && phase !== "error") || isRunning}
              className="flex items-center gap-2 bg-foreground hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed text-background font-medium px-5 py-3 rounded-xl text-sm transition-all"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isRunning ? "Analyzing…" : phase === "error" ? "Retry" : "Analyze"}
            </button>
          </div>

          {phase === "idle" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_ADDRESSES.map((addr) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => setAddress(addr)}
                  className="text-sm font-mono text-foreground/55 hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:border-border/60 transition-colors"
                >
                  {formatAddress(addr)}
                </button>
              ))}
            </div>
          )}
        </form>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {phase === "error" && error && (
        <div className="flex items-start gap-3 p-5 bg-destructive/5 border border-destructive/20 rounded-xl mb-6">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-medium text-destructive">Analysis Failed</p>
            <p className="text-sm text-destructive/70 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* ── Running state ──────────────────────────────────────────────── */}
      {isRunning && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-5 bg-nexis-green/5 border border-nexis-green/20 rounded-xl">
            <Loader2 className="w-5 h-5 text-nexis-green animate-spin shrink-0" />
            <div>
              <p className="text-base font-medium text-nexis-green">Analyzing wallet…</p>
              <p className="text-sm text-foreground/55 mt-0.5 font-mono">
                {address.slice(0, 14)}…{address.slice(-6)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              "Routing through AXL",
              "Fetching balances",
              "Analyzing transactions",
              "Multi-chain scan",
              "Risk assessment",
              "Generating report",
            ].map((label) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-nexis-green/20 bg-nexis-green/5 text-nexis-green text-sm animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-nexis-green shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-center text-foreground/50">
            Full analysis takes 1–3 minutes · don't close this tab
          </p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────── */}
      {phase === "done" && report && (
        <ResearchReport report={report} />
      )}

      {/* ── Idle state ─────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div className="mt-4 space-y-5">
          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                color: "#4488ff",
                title: "Trader Profiling",
                desc: "Classify wallets as trader, holder, bot, mule, or scam with confidence scores.",
              },
              {
                color: "#00ff88",
                title: "Multi-Chain Balances",
                desc: "ETH, Base, Arbitrum, Optimism, Polygon, BSC, and Avalanche in a single scan.",
              },
              {
                color: "#ff4466",
                title: "Risk & Scam Detection",
                desc: "Detect address poisoning, fund mixing, homoglyph tokens, and bot automation.",
              },
            ].map((card) => (
              <div key={card.title} className="p-5 rounded-xl border border-border bg-card">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${card.color}12`, border: `1px solid ${card.color}25` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: card.color }} />
                </div>
                <p className="text-base font-semibold text-foreground mb-1.5">{card.title}</p>
                <p className="text-sm text-foreground/65 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center py-10 space-y-2">
            <Link2 className="w-8 h-8 text-foreground/20 mx-auto" />
            <p className="text-base text-foreground/55">Enter a wallet or contract address above to begin</p>
            <p className="text-sm text-foreground/35">
              All queries routed via Gensyn AXL · results encrypted on 0G
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
