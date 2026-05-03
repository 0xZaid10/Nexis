import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser, useAuth, SignInButton } from "@clerk/react";
import {
  History, Search, ChevronRight, Loader2, AlertCircle,
  FlaskConical, RefreshCw, LogIn,
} from "lucide-react";
import { getSessions, type NexisSession } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CapabilityChip({ cap }: { cap: string }) {
  const map: Record<string, string> = {
    onchain: "text-blue-400 bg-blue-400/8 border-blue-400/20",
    reddit:  "text-orange-400 bg-orange-400/8 border-orange-400/20",
    market:  "text-purple-400 bg-purple-400/8 border-purple-400/20",
  };
  return (
    <span className={cn("text-xs font-mono px-2 py-0.5 rounded border",
      map[cap] ?? "text-foreground/50 bg-secondary border-border")}>
      {cap}
    </span>
  );
}

export default function Sessions() {
  const { user } = useUser();
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();

  const [sessions, setSessions] = useState<NexisSession[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  const userId = user?.id ?? "anonymous";
  const isAnonymous = isLoaded && !isSignedIn;

  async function load() {
    if (isAnonymous) return;
    setLoading(true);
    setError("");
    try {
      const data = await getSessions(userId);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAnonymous) load();
  }, [userId, isAnonymous]);

  const filtered = sessions.filter((s) =>
    (s.goal ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <History className="w-5 h-5 text-foreground/50" />
          <h1 className="text-xl font-semibold text-foreground">Sessions</h1>
          {!loading && !isAnonymous && (
            <span className="ml-auto text-sm text-foreground/50 font-mono border border-border bg-card px-2.5 py-1 rounded">
              {sessions.length} total
            </span>
          )}
          {!isAnonymous && (
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
          )}
        </div>
        <p className="text-base text-foreground/65">
          All your past research sessions, stored on-chain.
        </p>
      </div>

      {/* ── Sign-in wall for anonymous users ─────────────────────────── */}
      {isAnonymous ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-16 h-16 rounded-2xl bg-nexis-green/10 border border-nexis-green/20 flex items-center justify-center">
            <LogIn className="w-7 h-7 text-nexis-green" />
          </div>
          <div className="text-center max-w-sm">
            <h2 className="text-xl font-semibold text-foreground mb-2">Sign in to view sessions</h2>
            <p className="text-base text-foreground/65 leading-relaxed">
              Sessions are tied to your account. Sign in to access your private research history.
            </p>
          </div>
          <SignInButton mode="modal">
            <span className="flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium px-6 py-3 rounded-xl transition-all cursor-pointer select-none">
              Sign in to continue
              <ChevronRight className="w-4 h-4" />
            </span>
          </SignInButton>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="search"
              placeholder="Search sessions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-card-border rounded-xl pl-11 pr-4 py-3 text-base text-foreground placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-nexis-green/30 focus:border-nexis-green/50 transition-all"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-nexis-green animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Failed to load sessions</p>
                <p className="text-sm text-red-400/70 mt-0.5 font-mono">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <History className="w-10 h-10 text-foreground/20 mx-auto" />
              <p className="text-base text-foreground/55">
                {search ? "No sessions match your search." : "No research sessions yet."}
              </p>
              {!search && (
                <button
                  onClick={() => navigate("/")}
                  className="text-sm text-nexis-green hover:text-nexis-green/80 transition-colors"
                >
                  Start your first research →
                </button>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-2.5">
              {filtered.map((session) => {
                const sid  = session.sessionId;
                const caps = session.plan?.capabilities_run ?? [];
                const isDone = !!session.summary;
                return (
                  <button
                    key={sid}
                    onClick={() => navigate(`/sessions/${sid}`)}
                    className="w-full flex items-start gap-4 p-5 bg-card border border-card-border hover:border-border rounded-xl text-left transition-all hover:bg-secondary group"
                  >
                    <div className={cn(
                      "mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      isDone ? "bg-nexis-green/10" : "bg-amber-400/10"
                    )}>
                      <FlaskConical className={cn("w-4 h-4", isDone ? "text-nexis-green" : "text-amber-400")} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-base font-medium text-foreground leading-snug line-clamp-2">
                        {session.goal}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {caps.map((c) => <CapabilityChip key={c} cap={c} />)}
                        <span className="text-sm text-foreground/50 font-mono">
                          {timeAgo(session.run_at)}
                        </span>
                        <span className="text-sm text-foreground/30 font-mono hidden sm:inline">
                          {sid?.slice(0, 8)}…
                        </span>
                        {session.routedViaAXL && (
                          <span className="text-xs text-nexis-green/60 font-mono border border-nexis-green/20 px-1.5 py-0.5 rounded">
                            AXL
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-foreground/30 group-hover:text-nexis-green transition-colors shrink-0 mt-1.5" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
