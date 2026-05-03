import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/react";
import {
  Shield, Plus, Loader2, AlertCircle, CheckCircle2,
  ExternalLink, Zap, RefreshCw, X, ChevronDown,
  Send, Clock, Waves, TrendingUp, BarChart3, Bot,
  LogIn,
} from "lucide-react";
import {
  API_BASE, getWorkflows, createKeeperMonitor, simulateWorkflowTrigger,
  type Workflow, type WorkflowType, getWorkflowType,
} from "@/lib/api";
import { getTelegramChatId } from "@/pages/settings/Settings";
import { cn } from "@/lib/utils";
const TELEGRAM_BOT = "https://t.me/agent_nexis_bot";

// ─── Workflow type metadata ───────────────────────────────────────────────────

const TYPE_META: Record<WorkflowType, { label: string; badge: string; Icon: typeof Shield }> = {
  whale:       { label: "WHALE MONITOR",  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",   Icon: Waves      },
  scheduled:   { label: "SCHEDULED",      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",      Icon: Clock      },
  defi:        { label: "DEFI MONITOR",   badge: "bg-purple-500/10 text-purple-400 border-purple-500/20", Icon: BarChart3  },
  price_alert: { label: "PRICE ALERT",    badge: "bg-nexis-green/10 text-nexis-green border-nexis-green/20", Icon: TrendingUp },
  custom:      { label: "CUSTOM",         badge: "bg-secondary text-foreground/55 border-border",         Icon: Zap        },
};

const SCHEDULE_PRESETS = [
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour",       value: "0 * * * *"    },
  { label: "Every day 9am",    value: "0 9 * * *"    },
  { label: "Every Monday 9am", value: "0 9 * * 1"    },
  { label: "Custom cron…",     value: "custom"       },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastData { id: number; ok: boolean; title: string; body?: string }

function Toast({ t, onDismiss }: { t: ToastData; onDismiss: () => void }) {
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-sm w-full transition-all",
      t.ok
        ? "bg-nexis-green/5 border-nexis-green/20 text-nexis-green"
        : "bg-destructive/5 border-destructive/20 text-destructive"
    )}>
      {t.ok
        ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        : <AlertCircle  className="w-4 h-4 shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-snug">{t.title}</p>
        {t.body && <p className="text-xs mt-0.5 opacity-70 leading-relaxed">{t.body}</p>}
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Workflow Card ────────────────────────────────────────────────────────────

type TriggerState = "idle" | "loading" | "success" | "error";

function WorkflowCard({
  workflow,
  triggerState,
  onTrigger,
}: {
  workflow: Workflow;
  triggerState: TriggerState;
  onTrigger: () => void;
}) {
  const type = getWorkflowType(workflow.name);
  const meta = TYPE_META[type];
  const Icon = meta.Icon;
  const isActive = workflow.status === "active";
  const date = workflow.createdAt
    ? new Date(workflow.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-foreground/60" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase", meta.badge)}>
              {meta.label}
            </span>
            <span className={cn(
              "flex items-center gap-1 text-xs font-mono",
              isActive ? "text-nexis-green" : "text-foreground/40"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full inline-block", isActive ? "bg-nexis-green" : "bg-foreground/25")} />
              {workflow.status}
            </span>
          </div>
          <p className="text-base font-medium text-foreground leading-snug">{workflow.name}</p>
          {date && <p className="text-sm text-foreground/45 font-mono mt-0.5">Created {date}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <button
          onClick={onTrigger}
          disabled={triggerState === "loading"}
          className={cn(
            "flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all",
            triggerState === "success"
              ? "border-nexis-green/20 bg-nexis-green/5 text-nexis-green"
              : triggerState === "error"
              ? "border-destructive/20 bg-destructive/5 text-destructive"
              : "border-border bg-secondary hover:bg-secondary/80 text-foreground disabled:opacity-40"
          )}
        >
          {triggerState === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {triggerState === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
          {triggerState === "error"   && <AlertCircle  className="w-3.5 h-3.5" />}
          {triggerState === "idle"    && <Zap className="w-3.5 h-3.5" />}
          {triggerState === "loading" ? "Triggering…"
            : triggerState === "success" ? "Triggered"
            : triggerState === "error"   ? "Failed"
            : "Simulate Trigger"}
        </button>

        <a
          href={`https://app.keeperhub.com/workflows/${workflow.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border hover:bg-secondary"
        >
          View on KeeperHub
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── Create Monitor Modal ─────────────────────────────────────────────────────

interface CreateForm {
  type: WorkflowType;
  target: string;
  threshold: string;
  goal: string;
  schedule: string;
  customCron: string;
  network: string;
  telegramChatId: string;
}

const EMPTY_FORM: CreateForm = {
  type: "whale", target: "", threshold: "5",
  goal: "", schedule: "0 * * * *", customCron: "",
  network: "1", telegramChatId: getTelegramChatId(),
};

function CreateMonitorModal({
  onClose,
  onCreated,
  userId,
}: {
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}) {
  const [form, setForm]       = useState<CreateForm>(EMPTY_FORM);
  const [submitting, setSub]  = useState(false);
  const [error, setError]     = useState("");

  function set<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.telegramChatId.trim()) {
      setError("Telegram Chat ID is required for alerts.");
      return;
    }
    setSub(true);
    setError("");
    try {
      const payload = {
        type: form.type,
        target: form.target || undefined,
        threshold: form.threshold ? Number(form.threshold) : undefined,
        goal: form.goal || undefined,
        schedule: form.schedule === "custom" ? form.customCron : form.schedule,
        network: form.network,
        telegramChatId: form.telegramChatId,
        userId,
      };
      const res = await fetch(`${API_BASE}/api/keeper/create-monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { success?: boolean; error?: string; message?: string };
      if (!res.ok || data.success === false) throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create monitor");
    } finally {
      setSub(false);
    }
  }

  const typeOptions: { value: WorkflowType; label: string; desc: string }[] = [
    { value: "whale",       label: "Whale Monitor",      desc: "Alert when a wallet moves large amounts" },
    { value: "token",       label: "Token Monitor",      desc: "Track price % changes on a token" } as unknown as { value: WorkflowType; label: string; desc: string },
    { value: "defi",        label: "DeFi Monitor",       desc: "Monitor DeFi protocol contracts" },
    { value: "scheduled",   label: "Scheduled Research", desc: "Run AI research on a cron schedule" },
    { value: "price_alert", label: "Price Alert",        desc: "Daily ETH / token price briefings" },
  ];

  const showTarget    = ["whale", "token", "defi"].includes(form.type);
  const showThreshold = ["whale", "token"].includes(form.type);
  const showGoal      = ["scheduled", "defi", "price_alert"].includes(form.type);
  const showSchedule  = form.type === "scheduled";
  const showNetwork   = form.type === "defi";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-nexis-green" />
            <h2 className="text-base font-semibold text-foreground">Create Monitor</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-foreground/50 hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monitor Type</label>
            <div className="grid grid-cols-1 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("type", opt.value)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                    form.type === opt.value
                      ? "border-nexis-green/40 bg-nexis-green/5"
                      : "border-border bg-card hover:bg-secondary"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full border-2 shrink-0", form.type === opt.value ? "border-nexis-green bg-nexis-green" : "border-border")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-foreground/50">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Target */}
          {showTarget && (
            <Field label={form.type === "whale" ? "Wallet Address" : form.type === "token" ? "Token Address" : "Contract Address"} required>
              <Input
                placeholder="0x…"
                value={form.target}
                onChange={(v) => set("target", v)}
                mono
              />
            </Field>
          )}

          {/* Threshold */}
          {showThreshold && (
            <Field label={form.type === "whale" ? "Threshold (ETH)" : "Price Change (%)"}>
              <Input
                type="number"
                placeholder={form.type === "whale" ? "5" : "10"}
                value={form.threshold}
                onChange={(v) => set("threshold", v)}
              />
            </Field>
          )}

          {/* Goal */}
          {showGoal && (
            <Field label="Research Goal" required>
              <textarea
                rows={3}
                placeholder="Describe what you want to monitor or research…"
                value={form.goal}
                onChange={(e) => set("goal", e.target.value)}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-nexis-green/20 focus:border-nexis-green/40 transition-all resize-none"
              />
            </Field>
          )}

          {/* Schedule */}
          {showSchedule && (
            <Field label="Schedule">
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={form.schedule}
                    onChange={(e) => set("schedule", e.target.value)}
                    className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-nexis-green/20 appearance-none pr-8"
                  >
                    {SCHEDULE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40 pointer-events-none" />
                </div>
                {form.schedule === "custom" && (
                  <Input
                    placeholder="*/5 * * * *"
                    value={form.customCron}
                    onChange={(v) => set("customCron", v)}
                    mono
                  />
                )}
              </div>
            </Field>
          )}

          {/* Network */}
          {showNetwork && (
            <Field label="Network">
              <div className="relative">
                <select
                  value={form.network}
                  onChange={(e) => set("network", e.target.value)}
                  className="w-full bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-nexis-green/20 appearance-none pr-8"
                >
                  <option value="1">Ethereum</option>
                  <option value="8453">Base</option>
                  <option value="42161">Arbitrum</option>
                  <option value="10">Optimism</option>
                  <option value="137">Polygon</option>
                  <option value="56">BSC</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40 pointer-events-none" />
              </div>
            </Field>
          )}

          {/* Telegram Chat ID — required */}
          <div className="p-4 rounded-xl border border-nexis-green/15 bg-nexis-green/[0.03] space-y-3">
            <div className="flex items-start gap-2.5">
              <Send className="w-4 h-4 text-nexis-green mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Telegram Alerts <span className="text-nexis-green text-xs ml-1">required</span></p>
                <p className="text-xs text-foreground/55 mt-0.5 leading-relaxed">
                  Start the bot to get your Chat ID, then paste it below.
                </p>
              </div>
            </div>
            <a
              href={TELEGRAM_BOT}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-nexis-green/25 bg-nexis-green/5 text-nexis-green text-sm font-medium hover:bg-nexis-green/10 transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              Open @agent_nexis_bot
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <Input
              placeholder="Telegram Chat ID (e.g. 123456789)"
              value={form.telegramChatId}
              onChange={(v) => set("telegramChatId", v)}
              mono
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-foreground/65 hover:text-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground hover:bg-foreground/90 text-background text-sm font-medium transition-all disabled:opacity-40"
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</> : "Create Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-nexis-green ml-1 text-xs">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ placeholder, value, onChange, mono, type = "text" }: {
  placeholder?: string; value: string; onChange: (v: string) => void; mono?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground",
        "placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-nexis-green/20 focus:border-nexis-green/40 transition-all",
        mono && "font-mono"
      )}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KeeperHub() {
  const { user } = useUser();
  const { isSignedIn, isLoaded } = useAuth();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [triggerStates, setTrigger] = useState<Record<string, TriggerState>>({});
  const [toasts, setToasts]         = useState<ToastData[]>([]);

  const userId      = user?.id ?? "anonymous";
  const isAnonymous = isLoaded && !isSignedIn;

  function addToast(ok: boolean, title: string, body?: string) {
    const id = Date.now();
    setToasts((p) => [...p, { id, ok, title, body }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }

  async function load() {
    setLoading(true);
    const data = await getWorkflows();
    setWorkflows(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleTrigger(workflow: Workflow) {
    setTrigger((p) => ({ ...p, [workflow.id]: "loading" }));
    try {
      const res = await simulateWorkflowTrigger(workflow);
      setTrigger((p) => ({ ...p, [workflow.id]: res.success ? "success" : "error" }));
      if (res.success) {
        addToast(true, "Research triggered autonomously", res.goal ?? "Running in background — check Sessions for results");
      } else {
        addToast(false, "Trigger failed", "Check the API server logs for details");
      }
    } catch (err) {
      setTrigger((p) => ({ ...p, [workflow.id]: "error" }));
      addToast(false, "Trigger failed", err instanceof Error ? err.message : "Unknown error");
    }
    setTimeout(() => setTrigger((p) => ({ ...p, [workflow.id]: "idle" })), 3000);
  }

  async function handleCreated() {
    setShowCreate(false);
    addToast(true, "Monitor created", "Your new workflow is live on KeeperHub");
    await load();
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <Toast key={t.id} t={t} onDismiss={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Shield className="w-5 h-5 text-nexis-green" />
            <h1 className="text-xl font-semibold text-foreground">KeeperHub</h1>
            {!loading && (
              <span className="text-sm font-mono text-foreground/40 border border-border px-2 py-0.5 rounded">
                {workflows.length} workflows
              </span>
            )}
          </div>
          <p className="text-base text-foreground/65">
            Autonomous monitoring workflows — triggered by onchain events, schedules, or manual triggers.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-border text-foreground/50 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Monitor
          </button>
        </div>
      </div>

      {/* Telegram banner */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-nexis-green/15 bg-nexis-green/[0.03] mb-7">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-nexis-green/10 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-nexis-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Telegram Alerts</p>
            <p className="text-sm text-foreground/55">
              {isAnonymous
                ? "Start the bot to get your Chat ID — required for all monitor alerts."
                : "Connect Telegram to receive alerts when workflows trigger."}
            </p>
          </div>
        </div>
        <a
          href={TELEGRAM_BOT}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 shrink-0 bg-nexis-green/10 hover:bg-nexis-green/15 text-nexis-green text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-nexis-green/20"
        >
          <Send className="w-3.5 h-3.5" />
          @agent_nexis_bot
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      {/* Anonymous notice */}
      {isAnonymous && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/15 bg-amber-500/5 mb-6">
          <LogIn className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400">
            Browsing as guest — sign in to create private monitors tied to your account.
          </p>
        </div>
      )}

      {/* Workflows */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-nexis-green animate-spin" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Shield className="w-10 h-10 text-foreground/20 mx-auto" />
          <div>
            <p className="text-base text-foreground/55">No workflows yet</p>
            <p className="text-sm text-foreground/35 mt-1">
              Create your first monitor to start tracking wallets and protocols.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 text-sm text-nexis-green hover:text-nexis-green/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create first monitor
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              triggerState={triggerStates[wf.id] ?? "idle"}
              onTrigger={() => handleTrigger(wf)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateMonitorModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          userId={userId}
        />
      )}
    </div>
  );
}
