import { useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Link2, Users, TrendingUp, Zap, ArrowRight } from "lucide-react";

const USE_CASES = [
  {
    icon: Link2,
    color: "#ff4466",
    tag: "Onchain Intelligence",
    title: "Find Scam Wallets Before They Find You",
    subtitle:
      "Nexis analyzed wallet 0x49CAdA... and identified it as an address-poisoning mule with 90% confidence — from raw transaction data alone.",
    signals: [
      "4 Unicode homoglyph ETH tokens",
      "255 transactions, $0.002 balance remaining (pure pass-through)",
      "Templated transfer sizes indicating bot automation",
      "4 anonymous funding sources",
      "Zero DeFi protocol usage",
    ],
    proof:
      "Chainalysis identifies these patterns too. For $100,000/year, with a contract, with identity verification. Nexis does it free, privately, via API.",
    proofHighlight: true,
  },
  {
    icon: Users,
    color: "#4488ff",
    tag: "Community Research",
    title: "Find Real Market Insights from Community Data",
    subtitle:
      "Nexis analyzed 125 posts across Reddit, GitHub Issues, Hacker News, and the web for Notion pain points.",
    quote:
      '"I spent 3 years optimizing every second of my life... My Notion setup looked like a fucking NASA control center."',
    signals: [
      "Dual-layer extraction (behavioral + technical)",
      'Semantic clustering — "slow", "lag", "freeze" → performance cluster',
      "Three-tier validation: Confirmed / Strong Signal / Weak Signal",
      "Evidence quotes anchored to source data",
      "Domain classifier: crypto / SaaS / devtools / general",
    ],
    proof:
      "This is the kind of insight that takes a market research firm weeks. Nexis surfaces it in minutes, privately.",
  },
  {
    icon: TrendingUp,
    color: "#ffb700",
    tag: "Competitive Intelligence",
    title: "Research Competitors Without Tipping Them Off",
    subtitle:
      "When your IP queries a competitor's website repeatedly from your company's IP range, they know. Nexis routes all competitive research through AXL.",
    signals: [
      "Pricing page scraping",
      "Feature matrix extraction",
      "Community complaint analysis (Reddit, GitHub, HN)",
      "Hiring signal detection",
      "LLM positioning analysis",
    ],
    proof: null,
  },
  {
    icon: Zap,
    color: "#00ff88",
    tag: "Autonomous Monitoring",
    title: "Set It and Forget It — Private Intelligence on Autopilot",
    subtitle:
      "Create a KeeperHub workflow that watches Vitalik's wallet 24/7. When balance changes by more than 5 ETH, KeeperHub triggers Nexis, which runs full wallet intelligence privately, encrypts to 0G, and sends you a Telegram alert.",
    signals: [
      "Nexis Whale Monitor — Vitalik's wallet (>5 ETH)",
      "Nexis Whale Monitor — Scam wallet (>0.1 ETH)",
      "Nexis DeFi Monitor — Aave protocol",
      "Nexis Scheduled — Weekly DeFi privacy research",
      "ETH Price Movement Alert (LLM-generated)",
    ],
    signalsLabel: "Live workflows running right now:",
    proof: null,
  },
  {
    icon: ArrowRight,
    color: "#9b59b6",
    tag: "Fund Flow Tracing",
    title: "Follow the Money Privately",
    subtitle:
      "Trace funds from wallet A → B → C across multiple hops. Detect mixer deposits, exchange consolidation, and wallet clustering — all without revealing to any blockchain explorer that you're conducting the investigation.",
    signals: [],
    proof: null,
  },
];

function UseCase({ uc, idx }: { uc: (typeof USE_CASES)[0]; idx: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group p-8 rounded-2xl border border-border bg-card hover:border-[var(--nexis-accent-dim)] transition-all duration-300"
      data-testid={`use-case-card-${idx}`}
    >
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-none"
          style={{ background: `${uc.color}12`, border: `1px solid ${uc.color}25` }}
        >
          <uc.icon size={20} style={{ color: uc.color }} />
        </div>
        <div>
          <span
            className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${uc.color}12`, color: uc.color }}
          >
            {uc.tag}
          </span>
        </div>
      </div>

      <h2 className="font-display font-bold text-2xl text-foreground mb-3">{uc.title}</h2>
      <p className="text-lg text-foreground/75 leading-relaxed mb-5">{uc.subtitle}</p>

      {uc.quote && (
        <blockquote className="mb-5 pl-4 border-l-2 border-[var(--nexis-accent)] text-base text-foreground/70 italic leading-relaxed bg-[var(--nexis-accent-dim)] py-3 pr-3 rounded-r-lg">
          {uc.quote}
        </blockquote>
      )}

      {uc.signals.length > 0 && (
        <div className="mb-5">
          {uc.signalsLabel && (
            <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-3">
              {uc.signalsLabel}
            </p>
          )}
          <ul className="space-y-1.5">
            {uc.signals.map((signal, i) => (
              <li key={i} className="flex items-start gap-2.5 text-base text-foreground/75">
                <span style={{ color: uc.color }} className="mt-0.5 flex-none">→</span>
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uc.proof && (
        <p className={`text-base leading-relaxed ${uc.proofHighlight ? "text-foreground font-medium" : "text-foreground/75"}`}>
          {uc.proof}
        </p>
      )}
    </motion.div>
  );
}

export default function UseCases() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            Use Cases
          </p>
          <h1 className="font-display font-bold text-5xl sm:text-6xl text-foreground tracking-tight">
            What People Research with Nexis
          </h1>
        </motion.div>

        <div className="space-y-6">
          {USE_CASES.map((uc, idx) => (
            <UseCase key={idx} uc={uc} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
