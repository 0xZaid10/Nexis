import { useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Shield, Database, CreditCard, AlertTriangle, Check } from "lucide-react";

const LIMITS = [
  {
    title: "Local device compromise",
    text: "If your machine is compromised, the SQLite encryption key is accessible. Nexis protects your data from third parties — not from someone who has physical or remote access to your device.",
  },
  {
    title: "Traffic analysis at scale",
    text: "A sufficiently resourced adversary monitoring global internet traffic at scale might infer patterns over time through timing and volume analysis. AXL makes this extremely difficult — it's not impossible.",
  },
  {
    title: "Self-identifying queries",
    text: 'If your query contains uniquely identifying information — "research my company Acme Corp\'s competitors" — privacy is only as strong as the query itself. Nexis cannot anonymize what you explicitly include.',
  },
  {
    title: "Legal compulsion of the querier",
    text: "Nexis protects your data from third parties. It does not protect you from legal orders directed at you personally. If you are legally compelled to disclose your research, the local encryption key is in your possession.",
  },
];

const USE_CASES = [
  {
    title: "Investigative Journalism",
    text: "A journalist investigating a DAO treasury drain can trace fund flows across wallets without alerting subjects. Encrypted results mean a seized device doesn't reveal the investigation.",
  },
  {
    title: "DeFi Strategy",
    text: "A trader analyzing wallet clusters and token concentration before a position doesn't want market makers to see their research agenda.",
  },
  {
    title: "Competitive Intelligence",
    text: "A startup analyzing a competitor's pricing and community complaints doesn't want that competitor to see query patterns from their IP.",
  },
  {
    title: "Whistleblower Research",
    text: "Someone investigating financial misconduct can analyze on-chain evidence without creating a traceable research fingerprint.",
  },
  {
    title: "Medical and Legal Research",
    text: "Sensitive topic research conducted without building a profile that gets sold to data brokers or insurers.",
  },
  {
    title: "Human Rights and Activist Work",
    text: "Research into surveillance infrastructure or authoritarian governance without alerting subjects.",
  },
];

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

export default function Privacy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen pt-24 pb-32">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 mb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            Privacy Architecture
          </p>
          <h1 className="font-display font-bold text-5xl sm:text-6xl text-foreground tracking-tight mb-6">
            How Private Is Nexis, Really?
          </h1>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-20">
        {/* Layer 1 */}
        <Section>
          <div className="flex items-start gap-5 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--nexis-accent-dim)] border border-[var(--nexis-accent)]/20 flex-none">
              <Shield size={22} className="text-[var(--nexis-accent)]" />
            </div>
            <div>
              <p className="text-sm text-foreground/55 uppercase tracking-wider mb-1">Layer 1</p>
              <h2 className="font-display font-bold text-3xl text-foreground">Request Privacy — Gensyn AXL</h2>
            </div>
          </div>

          <div className="space-y-4 text-lg text-foreground/75 leading-relaxed mb-8">
            <p>
              Every outbound HTTP request from Nexis — RPC calls, Reddit scraping, GitHub API,
              Etherscan, SearchAPI — is routed through Gensyn's AXL network before it reaches any
              data provider.
            </p>
            <p>
              AXL is a peer-to-peer encrypted mesh network. When Nexis queries Etherscan for a
              wallet's transaction history, the request originates from an AXL node, not your IP
              address. The AXL node's identity is cryptographically separated from yours. Etherscan
              sees a request from the AXL network — not from you.
            </p>
            <p className="font-medium text-foreground">
              Even if Etherscan, Reddit, or any data provider cooperates fully with law
              enforcement, is breached, or sells their query logs — they cannot identify who made
              the query. They see AXL. They don't see you.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check size={15} className="text-[var(--nexis-accent)]" />
              Every Nexis API response includes{" "}
              <code className="font-mono text-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)] px-1.5 py-0.5 rounded">
                "routedViaAXL": true
              </code>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-foreground/55 uppercase tracking-wider mb-3">AXL Node Identity</p>
              <div className="font-mono text-sm space-y-1.5 text-foreground/65">
                <div><span className="text-foreground">Public key: </span>ca6b4b2c7d762faceb49947dbffc3233b95d1cf3ccbb0be2e93a3fd403c6fc22</div>
                <div><span className="text-foreground">IPv6: </span>200:6b29:69a7:513:a0a6:296c:d704:8007</div>
              </div>
            </div>
          </div>
        </Section>

        {/* Layer 2 */}
        <Section delay={0.1}>
          <div className="flex items-start gap-5 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#4488ff]/10 border border-[#4488ff]/20 flex-none">
              <Database size={22} className="text-[#4488ff]" />
            </div>
            <div>
              <p className="text-sm text-foreground/55 uppercase tracking-wider mb-1">Layer 2</p>
              <h2 className="font-display font-bold text-3xl text-foreground">Storage Privacy — 0G Storage</h2>
            </div>
          </div>

          <div className="space-y-4 text-lg text-foreground/75 leading-relaxed mb-8">
            <p>After every research session, results are never stored on a centralized server.</p>
            <ol className="space-y-2 list-none">
              {[
                "Results serialized to JSON",
                "AES-256 encryption with a key generated locally on your machine",
                "The encryption key stored in local SQLite — never transmitted",
                "Encrypted blob uploaded to 0G's decentralized storage network",
                "Root hash returned and anchored on-chain (verifiable)",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-[#4488ff]/10 text-[#4488ff]">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="font-medium text-foreground">
              The encrypted data lives on a decentralized network. Without the local encryption
              key, the stored data is computationally indistinguishable from noise. Even 0G storage
              nodes cannot read your research. Even we cannot read your research.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 font-mono text-sm space-y-2 text-foreground/65">
            <p className="text-foreground font-medium text-sm mb-4">Example — Real Session</p>
            <div><span className="text-foreground">rootHash: </span>0x02dfb800e6433ddb65c74484b84347ae58f424762ba83a3999f52d453df009cd</div>
            <div><span className="text-foreground">txHash: </span>0xce9fdc6d366e1bc58c3eb2d64599b7c0d1d1bbaa6b34ca9d421da64a690149c6</div>
            <div><span className="text-foreground">encrypted: </span><span className="text-[var(--nexis-accent)]">true</span></div>
          </div>
        </Section>

        {/* Layer 3 */}
        <Section delay={0.1}>
          <div className="flex items-start gap-5 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#ffb700]/10 border border-[#ffb700]/20 flex-none">
              <CreditCard size={22} className="text-[#ffb700]" />
            </div>
            <div>
              <p className="text-sm text-foreground/55 uppercase tracking-wider mb-1">Layer 3 — Coming in Phase 2</p>
              <h2 className="font-display font-bold text-3xl text-foreground">Payment Privacy — x402</h2>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-card">
            <p className="text-lg text-foreground/75 leading-relaxed">
              Anonymous micropayments via the x402 protocol. Pay for research with USDC on
              Base — no account, no identity, just a payment and a result. Any agent can call
              Nexis autonomously without revealing who they are.
            </p>
          </div>
        </Section>

        {/* Limits */}
        <Section delay={0.1}>
          <div className="flex items-start gap-5 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#ff4466]/10 border border-[#ff4466]/20 flex-none">
              <AlertTriangle size={22} className="text-[#ff4466]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-3xl text-foreground">What Nexis Cannot Protect Against</h2>
              <p className="text-base text-foreground/55 mt-1">Intellectual honesty</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {LIMITS.map((limit, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-border bg-card" data-testid={`privacy-limit-${idx}`}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} className="text-[#ff4466]" />
                  <h3 className="font-semibold text-sm text-foreground">{limit.title}</h3>
                </div>
                <p className="text-base text-foreground/75 leading-relaxed">{limit.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Use cases */}
        <Section delay={0.1}>
          <h2 className="font-display font-bold text-3xl text-foreground mb-8">Sensitive Use Cases</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {USE_CASES.map((uc, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-border bg-card hover:border-[var(--nexis-accent-dim)] transition-all duration-300" data-testid={`use-case-privacy-${idx}`}>
                <h3 className="font-semibold text-sm text-foreground mb-2">{uc.title}</h3>
                <p className="text-base text-foreground/75 leading-relaxed">{uc.text}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
