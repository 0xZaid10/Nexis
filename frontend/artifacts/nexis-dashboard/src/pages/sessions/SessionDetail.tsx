import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { getSession, normalizeReport, type NexisSession } from "@/lib/api";
import { ResearchReport } from "@/components/research/ResearchReport";

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const [, navigate] = useLocation();
  const sessionId = params?.id ?? "";

  const [session, setSession] = useState<NexisSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  async function load() {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [sessionId]);

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate("/sessions")}
          className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Sessions
        </button>
        {!loading && session && (
          <button
            onClick={load}
            className="ml-auto p-1.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 text-nexis-green animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-5 bg-destructive/5 border border-destructive/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-medium text-destructive">Failed to load session</p>
            <p className="text-sm text-destructive/70 mt-1 font-mono">{error}</p>
            <button
              onClick={load}
              className="mt-2 text-sm text-destructive/60 hover:text-destructive transition-colors"
            >
              Retry →
            </button>
          </div>
        </div>
      )}

      {!loading && session && (
        <ResearchReport report={normalizeReport(session as unknown as Record<string, unknown>)} />
      )}
    </div>
  );
}
