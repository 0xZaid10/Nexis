import { useState, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";

const TERMINAL_LINES = [
  { text: '$ nexis research "Analyze wallet 0x49CAdA74991C0090AF0be3FD387B17f1Da9d903D"', type: "command" },
  { text: "", type: "blank" },
  { text: "  Routing through Gensyn AXL...          ✓ identity hidden", type: "success" },
  { text: "  Planning research goal...              ✓ onchain capability selected", type: "success" },
  { text: "  Querying Etherscan V2 (7 chains)...    ✓ routed via AXL", type: "success" },
  { text: "  Analyzing 255 transactions...          ✓", type: "success" },
  { text: "  Detecting token patterns...            ✓ 4 homoglyph ETH tokens found", type: "success" },
  { text: "  Running LLM synthesis...               ✓", type: "success" },
  { text: "  Encrypting results (AES-256)...        ✓", type: "success" },
  { text: "  Storing on 0G Storage...               ✓ rootHash: 0x02dfb800...", type: "success" },
  { text: "", type: "blank" },
  { text: "  Classification: ⚠ SCAM DETECTED (90% confidence)", type: "scam" },
  { text: '  "This is not a trader. This is an automated mule wallet', type: "quote" },
  { text: '   in an address-poisoning drainer operation."', type: "quote" },
  { text: "", type: "blank" },
  { text: "  routedViaAXL: true  ·  encrypted: true  ·  duration: 63s", type: "meta" },
];

function getLineStyle(type: string): string {
  switch (type) {
    case "command": return "text-[var(--nexis-accent)] font-medium";
    case "success": return "text-foreground";
    case "scam": return "text-[#ff4466] font-semibold";
    case "quote": return "text-[#ffb700] italic";
    case "meta": return "text-foreground/55 text-xs";
    case "blank": return "";
    default: return "text-foreground/55";
  }
}

export default function TerminalDemo() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    const delays = [0, 0, 400, 900, 1400, 1900, 2400, 2900, 3400, 3700, 4000, 4200, 4700, 5100, 5200, 5700];
    delays.forEach((delay, idx) => {
      setTimeout(() => {
        setVisibleCount((v) => Math.max(v, idx + 1));
      }, delay);
    });
  }, [inView]);

  const copyCommand = () => {
    navigator.clipboard.writeText(
      `curl -s -X POST http://34.163.214.137:3000/api/research/sync -H "Content-Type: application/json" -d '{"goal":"Analyze wallet 0x49CAdA74991C0090AF0be3FD387B17f1Da9d903D","userId":"my-user"}'`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          {/* Terminal window */}
          <div className="rounded-2xl border border-border bg-[#0d0d0d] dark:bg-[#0d0d0d] overflow-hidden shadow-2xl">
            {/* Title bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-[#111111]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <span className="text-xs font-mono text-foreground/50">nexis — research</span>
              <button
                onClick={copyCommand}
                data-testid="button-copy-terminal"
                className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                {copied ? <Check size={12} className="text-[var(--nexis-accent)]" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Terminal body */}
            <div className="p-6 font-mono text-sm leading-7 min-h-[360px]">
              {TERMINAL_LINES.slice(0, visibleCount).map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={getLineStyle(line.type)}
                >
                  {line.text || "\u00a0"}
                </motion.div>
              ))}
              {visibleCount < TERMINAL_LINES.length && (
                <span className="cursor-blink text-[var(--nexis-accent)]">█</span>
              )}
            </div>

            {/* AXL indicator bar */}
            <div className="px-6 py-3 border-t border-border bg-[#0d1a12] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--nexis-accent)] animate-pulse" />
              <span className="text-xs font-mono text-[var(--nexis-accent)]">
                Gensyn AXL node active · identity protected · ca6b4b2c...
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
