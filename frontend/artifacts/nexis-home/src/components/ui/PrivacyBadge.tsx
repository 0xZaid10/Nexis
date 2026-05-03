import { useState } from "react";
import { Lock, Check, Copy } from "lucide-react";

interface PrivacyBadgeProps {
  rootHash?: string;
  compact?: boolean;
}

export default function PrivacyBadge({ rootHash, compact = false }: PrivacyBadgeProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!rootHash) return;
    navigator.clipboard.writeText(rootHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)] text-xs font-medium text-[var(--nexis-accent)]">
        <Lock size={11} />
        Private · AXL · 0G
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)] p-4 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-sm text-[var(--nexis-accent)]">
        <Lock size={13} />
        PRIVATE SESSION
      </div>
      <div className="space-y-1.5">
        {[
          { label: "Gensyn AXL routing" },
          { label: "AES-256 encrypted" },
          { label: "0G decentralized" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-foreground/65">{item.label}</span>
            <span className="text-[var(--nexis-accent)] flex items-center gap-1">
              <Check size={11} />
            </span>
          </div>
        ))}
        {rootHash && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--nexis-accent)]/20">
            <span className="font-mono text-muted-foreground truncate max-w-[140px]">
              {rootHash.slice(0, 12)}...
            </span>
            <button
              onClick={copy}
              className="flex items-center gap-1 text-[var(--nexis-accent)] hover:opacity-70 transition-opacity"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
