import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";

const FLAGS = [
  "4 Unicode homoglyph ETH tokens: ĖTĤ  ℰ⊤ℋ  ℰꓔΗ  ЕТℋ",
  "Pass-through economics: funds in → funds out, zero retention",
  "Templated transfer sizes: 0.25–0.34 ETH (bot automation)",
  "4 anonymous funding sources, none identified",
  "Zero DeFi protocol usage across 255 transactions",
];

export default function ProofSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText("0x02dfb800e6433ddb65c74484b84347ae58f424762ba83a3999f52d453df009cd");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            Proof of Work
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground tracking-tight">
            Nexis Found a Live Scam Wallet
            <br />
            From Raw Onchain Data
          </h2>
          <p className="mt-5 text-lg text-foreground/75 max-w-2xl mx-auto leading-relaxed">
            We picked a random wallet from Etherscan and asked Nexis to analyze it.
            Input:{" "}
            <span className="text-foreground font-medium italic">
              "Analyze this Ethereum wallet and identify what kind of trader they are."
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="scam-glow rounded-2xl border-2 border-[#ff4466] bg-card overflow-hidden"
          data-testid="scam-wallet-card"
        >
          {/* Header badge */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#ff446615] border-b border-[#ff446630]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ff4466] text-white text-sm font-bold">
                <AlertTriangle size={14} />
                SCAM DETECTED
              </div>
              <span className="text-sm text-foreground/70">90% confidence</span>
            </div>
            <span className="text-sm font-mono text-foreground/60 hidden sm:block">
              0x49CAdA...903D
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Classification */}
            <div>
              <p className="text-xs text-foreground/55 uppercase tracking-wider mb-1">Classification</p>
              <p className="text-sm font-medium text-foreground">
                Automated mule wallet / Address-poisoning relay
              </p>
              <p className="text-sm text-foreground/65 mt-1">
                Active window: Feb 1 – May 1, 2026 (255 transactions, $0.002 balance)
              </p>
            </div>

            {/* Risk flags */}
            <div>
              <p className="text-xs text-foreground/55 uppercase tracking-wider mb-3">Risk Signals</p>
              <ul className="space-y-2">
                {FLAGS.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-base">
                    <span className="text-[#ff4466] mt-0.5 flex-none">🚨</span>
                    <span className="text-foreground/80">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* LLM Quote */}
            <blockquote className="border-l-2 border-[#ff4466] pl-4 py-2 bg-[#ff446608] rounded-r-lg">
              <p className="text-base text-foreground italic leading-relaxed">
                "This is not a trader. It is an automated mule wallet in a scam/drainer
                operation. The correct taxonomy is adversarial infrastructure."
              </p>
            </blockquote>

            {/* Privacy proof */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              <span className="text-sm text-foreground/65 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--nexis-accent)]" />
                routedViaAXL: true
              </span>
              <span className="text-sm text-foreground/40">·</span>
              <span className="text-sm text-foreground/65">encrypted: true</span>
              <span className="text-sm text-foreground/40">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono text-foreground/65">rootHash: 0x02dfb800...</span>
                <button
                  onClick={copyHash}
                  data-testid="button-copy-root-hash"
                  className="p-1 rounded text-foreground/50 hover:text-foreground transition-colors"
                >
                  {copied ? <Check size={11} className="text-[var(--nexis-accent)]" /> : <Copy size={11} />}
                </button>
                <a
                  href="https://storagescan-galileo.0g.ai/tx/0xce9fdc6d366e1bc58c3eb2d64599b7c0d1d1bbaa6b34ca9d421da64a690149c6"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-view-on-0g"
                  className="p-1 rounded text-foreground/50 hover:text-[var(--nexis-accent)] transition-colors"
                >
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 text-center text-base text-foreground/75"
        >
          Chainalysis would have told you this. For{" "}
          <span className="text-foreground font-semibold">$100,000/year</span>. Nexis told you for{" "}
          <span className="text-[var(--nexis-accent)] font-semibold">free</span>. Privately.
        </motion.p>
      </div>
    </section>
  );
}
