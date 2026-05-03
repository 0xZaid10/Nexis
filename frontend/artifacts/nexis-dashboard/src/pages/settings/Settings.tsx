import { useUser, useClerk } from "@clerk/react";
import {
  Settings as SettingsIcon, User, Shield, LogOut, Copy, Check,
  Sun, Moon, Send, Bot, ExternalLink, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TELEGRAM_BOT_URL = "https://t.me/agent_nexis_bot";
const TELEGRAM_CHAT_ID_KEY = "nexis_telegram_chat_id";

export function getTelegramChatId(): string {
  return localStorage.getItem(TELEGRAM_CHAT_ID_KEY) ?? "";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-card-border">
        <h2 className="text-sm font-semibold text-foreground/55 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="divide-y divide-card-border">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, action }: {
  label: string; value?: string; mono?: boolean; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/55">{label}</p>
        {value && (
          <p className={cn("text-base text-foreground mt-0.5 truncate", mono && "font-mono text-sm")}>{value}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-border/60"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-nexis-green" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Telegram section ─────────────────────────────────────────────────────────

function TelegramSection() {
  const [chatId, setChatId]   = useState(() => getTelegramChatId());
  const [input, setInput]     = useState(() => getTelegramChatId());
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    const stored = getTelegramChatId();
    setChatId(stored);
    setInput(stored);
  }, []);

  function handleSave() {
    const val = input.trim();
    if (val && !/^\-?\d+$/.test(val)) {
      setError("Chat ID must be a number (e.g. 123456789 or -100123456789 for groups).");
      return;
    }
    setError("");
    localStorage.setItem(TELEGRAM_CHAT_ID_KEY, val);
    setChatId(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClear() {
    localStorage.removeItem(TELEGRAM_CHAT_ID_KEY);
    setChatId("");
    setInput("");
  }

  const isConnected = !!chatId;

  return (
    <div className="px-6 py-5 space-y-5">

      {/* Status bar */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl border",
        isConnected
          ? "bg-nexis-green/[0.04] border-nexis-green/20"
          : "bg-secondary/40 border-border"
      )}>
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          isConnected ? "bg-nexis-green/10" : "bg-secondary"
        )}>
          <Bot className={cn("w-4 h-4", isConnected ? "text-nexis-green" : "text-foreground/40")} />
        </div>
        <div className="flex-1 min-w-0">
          {isConnected ? (
            <>
              <p className="text-sm font-medium text-foreground">Telegram connected</p>
              <p className="text-sm text-foreground/50 font-mono mt-0.5">Chat ID: {chatId}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Not connected</p>
              <p className="text-sm text-foreground/50 mt-0.5">Add your Chat ID to receive monitor alerts.</p>
            </>
          )}
        </div>
        {isConnected && (
          <CheckCircle2 className="w-4 h-4 text-nexis-green shrink-0" />
        )}
      </div>

      {/* How to get Chat ID */}
      <div className="space-y-2.5">
        <p className="text-sm font-medium text-foreground">How to get your Chat ID</p>
        <div className="space-y-2">
          {[
            { n: "1", text: "Open the Nexis bot on Telegram" },
            { n: "2", text: "Send /start — the bot replies with your Chat ID" },
            { n: "3", text: "Paste it below and save" },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3 text-sm text-foreground/65">
              <span className="w-5 h-5 rounded-full bg-secondary border border-border text-xs flex items-center justify-center shrink-0 font-mono text-foreground/50 mt-0.5">
                {step.n}
              </span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>

        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-nexis-green hover:text-nexis-green/80 transition-colors border border-nexis-green/20 bg-nexis-green/5 hover:bg-nexis-green/10 px-4 py-2 rounded-lg"
        >
          <Send className="w-3.5 h-3.5" />
          Open @agent_nexis_bot
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Telegram Chat ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 123456789"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            className="flex-1 bg-card border border-card-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-nexis-green/20 focus:border-nexis-green/40 transition-all"
          />
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0",
              saved
                ? "bg-nexis-green/10 text-nexis-green border border-nexis-green/20"
                : "bg-foreground hover:bg-foreground/90 text-background"
            )}
          >
            {saved ? <><CheckCircle2 className="w-3.5 h-3.5" />Saved</> : "Save"}
          </button>
          {isConnected && (
            <button
              onClick={handleClear}
              className="px-3 py-2.5 rounded-lg text-sm text-foreground/50 hover:text-destructive border border-border hover:border-destructive/30 transition-all"
            >
              Clear
            </button>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        <p className="text-xs text-foreground/40 leading-relaxed">
          Stored locally in your browser. This Chat ID will auto-fill when creating KeeperHub monitors.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { theme, toggle } = useTheme();
  const userId = user?.id?.slice(0, 16) ?? "";

  return (
    <div className="min-h-full p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <SettingsIcon className="w-5 h-5 text-foreground/50" />
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
        <p className="text-base text-foreground/65">Manage your account and preferences.</p>
      </div>

      <div className="space-y-4">
        <Section title="Profile">
          <Row
            label="Full Name"
            value={user?.fullName || "—"}
            action={
              <button onClick={() => openUserProfile()} className="text-sm text-nexis-green hover:text-nexis-green/80 transition-colors">
                Edit profile →
              </button>
            }
          />
          <Row label="Email" value={user?.primaryEmailAddress?.emailAddress || "—"} />
          <Row label="Account ID" value={userId} mono action={<CopyButton value={userId} />} />
        </Section>

        {/* Telegram */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground/55 uppercase tracking-wider flex-1">Telegram Alerts</h2>
            <Send className="w-3.5 h-3.5 text-nexis-green" />
          </div>
          <TelegramSection />
        </div>

        <Section title="Appearance">
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/55">Theme</p>
              <p className="text-base text-foreground mt-0.5 capitalize">{theme}</p>
            </div>
            <button
              onClick={toggle}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            >
              {theme === "dark"
                ? <><Sun className="w-3.5 h-3.5" /> Switch to Light</>
                : <><Moon className="w-3.5 h-3.5" /> Switch to Dark</>
              }
            </button>
          </div>
          <Row
            label="Accent Color"
            value={theme === "dark" ? "#10b981 (emerald)" : "#059669 (emerald)"}
            mono
            action={<div className="w-5 h-5 rounded-full bg-nexis-green border border-nexis-green/30" />}
          />
        </Section>

        <Section title="API">
          <Row label="API Endpoint" value="/api/nexis (proxied)" mono action={<CopyButton value="/api/nexis" />} />
          <Row label="Upstream" value="http://34.163.214.137:3000" mono />
          <Row label="Rate Limit" value="5 research runs / IP (free tier)" />
          <Row label="Authentication" value="Clerk JWT · No API key required" />
        </Section>

        <Section title="Account">
          <Row
            label="Manage Account"
            value="Update email, password, connected accounts"
            action={
              <button
                onClick={() => openUserProfile()}
                className="flex items-center gap-1.5 text-sm text-foreground/55 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-border/60"
              >
                <User className="w-3.5 h-3.5" />
                Manage
              </button>
            }
          />
          <Row
            label="Sign Out"
            value="End your current session"
            action={
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors px-3 py-1.5 rounded-lg border border-destructive/20 hover:border-destructive/40 bg-destructive/5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            }
          />
        </Section>

        <div className="flex items-center gap-2 pt-2">
          <Shield className="w-3.5 h-3.5 text-foreground/30" />
          <p className="text-sm text-foreground/35">
            Research data is protected with ZK-verified privacy proofs.
          </p>
        </div>
      </div>
    </div>
  );
}
