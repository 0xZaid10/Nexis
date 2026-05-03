import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  FlaskConical, Sparkles, Loader2, ChevronRight,
  AlertCircle, CheckCircle2, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeReport, type NormalizedReport } from "@/lib/api";
import { ResearchReport } from "@/components/research/ResearchReport";

const API_BASE = "/api/nexis";

const EXAMPLE_QUERIES = [
  "Research the Tornado Cash protocol and privacy concerns",
  "Analyze 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D for rug pull risks",
  "Audit the Uniswap V3 router for security vulnerabilities",
  "Investigate suspicious activity on Binance Smart Chain",
  "Analyze wallet clustering for known scam addresses",
];

const STEPS = [
  "Initializing research context",
  "Fetching onchain data",
  "Analyzing transaction patterns",
  "Querying community signals",
  "Generating privacy proof",
  "Compiling intelligence report",
];

const STEP_DELAYS_MS = [8_000, 45_000, 80_000, 115_000, 150_000, 185_000];

type Phase = "idle" | "running" | "done" | "error";

export default function NewResearch() {
  const { user } = useUser();

  const [query, setQuery]     = useState("");
  const [phase, setPhase]     = useState<Phase>("idle");
  const [error, setError]     = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [lines, setLines]     = useState<string[]>([]);
  const [report, setReport]   = useState<NormalizedReport | null>(null);

  const termRef  = useRef<HTMLDivElement>(null);
  const timers   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => () => clearAll(), []);

  function addLine(line: string) { setLines((p) => [...p.slice(-80), line]); }

  function clearAll() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function scheduleStepAnimation() {
    let elapsed = 0;
    STEP_DELAYS_MS.forEach((delay, i) => {
      elapsed += delay;
      const t = setTimeout(() => {
        const next = i + 1;
        setStepIdx(next);
        if (next < STEPS.length) addLine(`> [${next + 1}/${STEPS.length}] ${STEPS[next]}`);
      }, elapsed);
      timers.current.push(t);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const goal = query.trim();
    if (!goal || phase === "running") return;

    clearAll();
    setPhase("running");
    setError("");
    setReport(null);
    setStepIdx(0);
    setLines([]);

    addLine(`> nexis research --goal "${goal}"`);
    addLine("> Connecting to Nexis intelligence network...");
    addLine(`> [1/${STEPS.length}] ${STEPS[0]}`);
    setStepIdx(1);
    scheduleStepAnimation();

    const userId = user?.id ?? "anonymous";
    addLine(`> userId: ${userId.slice(0, 28)}${userId.length > 28 ? "…" : ""}`);
    addLine(`> POST /api/research/sync — awaiting full result...`);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
    timers.current.push(timeoutId);

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
      if (!normalized.sessionId) {
        addLine(`> Response keys: [${Object.keys(raw).join(", ")}]`);
        throw new Error("No sessionId in response");
      }

      clearAll();
      setStepIdx(STEPS.length);
      addLine(`> ✓ Research complete — session ${normalized.sessionId.slice(0, 8)}...`);
      if (normalized.routedViaAXL) addLine(`> ✓ Routed via AXL privacy layer`);
      if (normalized.capabilities.length) addLine(`> Capabilities: ${normalized.capabilities.join(", ")}`);
      setReport(normalized);
      setPhase("done");
    } catch (err) {
      clearAll();
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const msg = isAbort
        ? "Request timed out — research may still be running. Check Sessions."
        : (err instanceof Error ? err.message : "Failed");
      setError(msg);
      addLine(`> ✗ ${msg}`);
      setPhase("error");
    }
  }

  function handleReset() {
    clearAll();
    setPhase("idle");
    setError("");
    setReport(null);
    setStepIdx(0);
    setLines([]);
    setQuery("");
  }

  const isRunning = phase === "running";

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">

      {/* ── Header / form ────────────────────────────────────────────── */}
      {phase === "done" ? (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <CheckCircle2 className="w-4 h-4 text-nexis-green" />
            <span>Research complete</span>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground border border-border bg-card hover:bg-secondary px-3 py-1.5 rounded-lg transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            New Research
          </button>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <div className="flex items-center gap-2.5 mb-1.5">
              <FlaskConical className="w-5 h-5 text-foreground/50" />
              <h1 className="text-xl font-semibold text-foreground">New Research</h1>
            </div>
            <p className="text-base text-foreground/65">
              AI-powered intelligence on any wallet, contract, protocol, or topic — all queries routed privately via AXL.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isRunning}
                placeholder="Describe what you want to research — a wallet address, contract, protocol, or topic..."
                rows={4}
                className={cn(
                  "w-full bg-card border border-card-border rounded-xl p-4 pr-16 text-base text-foreground",
                  "placeholder:text-foreground/35 resize-none focus:outline-none",
                  "focus:ring-2 focus:ring-nexis-green/20 focus:border-nexis-green/40 transition-all font-mono leading-relaxed",
                  isRunning && "opacity-60 cursor-not-allowed"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
                }}
              />
              <span className="absolute bottom-3 right-3 text-[10px] text-foreground/30 font-mono select-none">⌘↵</span>
            </div>

            {!isRunning && (
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuery(q)}
                    className="text-sm border border-border bg-card hover:bg-secondary text-foreground/60 hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {q.length > 52 ? q.slice(0, 52) + "…" : q}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!query.trim() || isRunning}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isRunning
                    ? "bg-nexis-green/10 text-nexis-green border border-nexis-green/20 cursor-not-allowed"
                    : "bg-foreground hover:bg-foreground/90 text-background",
                  !query.trim() && !isRunning && "opacity-40 cursor-not-allowed"
                )}
              >
                {isRunning
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Researching…</>
                  : <><Sparkles className="w-3.5 h-3.5" />Run Research</>
                }
              </button>
              {phase === "error" && (
                <button type="button" onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-card hover:bg-secondary transition-all">
                  Reset
                </button>
              )}
              {isRunning && (
                <span className="text-sm text-foreground/50">
                  Takes 1–5 min · don't close this tab
                </span>
              )}
            </div>
          </form>
        </>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {phase === "done" && report && (
        <div className="mb-8">
          <ResearchReport report={report} />
        </div>
      )}

      {/* ── Pipeline + terminal ──────────────────────────────────────── */}
      {phase !== "idle" && (
        <div className={cn("space-y-4", phase === "done" && "mt-2")}>
          {phase === "done" ? (
            <TerminalCollapsed lines={lines} />
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-foreground/40 font-mono tracking-wider uppercase px-1">Research Pipeline</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STEPS.map((label, i) => {
                  const done   = i < stepIdx;
                  const active = i === stepIdx - 1 && isRunning;
                  return (
                    <div key={i} className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm transition-all duration-500",
                      done   ? "border-nexis-green/20 bg-nexis-green/5 text-nexis-green" :
                      active ? "border-nexis-green/30 bg-nexis-green/8 text-nexis-green animate-pulse" :
                               "border-border bg-card text-foreground/40"
                    )}>
                      {done
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        : <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-nexis-green" : "bg-border")} />
                      }
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="flex items-start gap-3 p-5 bg-destructive/5 border border-destructive/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-base font-medium text-destructive">Research Failed</p>
                    <p className="text-sm text-destructive/70 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <TerminalFull lines={lines} isRunning={isRunning} termRef={termRef} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Terminal components ──────────────────────────────────────────────────────

function lineColor(line: string): string {
  if (line.startsWith("> ✓"))       return "text-nexis-green";
  if (line.startsWith("> ✗"))       return "text-red-400";
  if (line.startsWith("> ["))       return "text-blue-400/70";
  if (line.startsWith("> POST"))    return "text-yellow-400/60";
  if (line.startsWith("> userId"))  return "text-foreground/30";
  if (line.startsWith("> Capab"))   return "text-purple-400/70";
  return "text-zinc-400";
}

function TerminalFull({ lines, isRunning, termRef }: {
  lines: string[];
  isRunning: boolean;
  termRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={termRef}
      className="bg-[#080808] border border-white/[0.06] rounded-xl p-4 h-44 overflow-y-auto font-mono text-xs leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className={cn("py-px", lineColor(line))}>{line}</div>
      ))}
      {isRunning && <div className="text-nexis-green/40 mt-0.5">█</div>}
    </div>
  );
}

function TerminalCollapsed({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border/40 pt-4 mt-4">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors w-full">
        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-90")} />
        <span className="font-mono">Terminal output</span>
        <span className="text-foreground/30 font-mono ml-1">({lines.length} lines)</span>
      </button>
      {open && (
        <div className="mt-3 bg-[#080808] border border-white/[0.06] rounded-xl p-4 max-h-44 overflow-y-auto font-mono text-xs leading-relaxed">
          {lines.map((line, i) => (
            <div key={i} className={cn("py-px", lineColor(line))}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
