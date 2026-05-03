import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Users, Link2, TrendingUp, Globe, Zap, ArrowRight } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Users,
    title: "Community Intelligence",
    sources: "Reddit · GitHub Issues · Hacker News · Web",
    description:
      "Multi-source research with semantic clustering, dual-layer extraction (behavioral + technical), and three-tier signal validation. Evidence-anchored findings with direct quotes.",
    quote: '"I spent 3 years optimizing every second of my life... My Notion setup looked like a fucking NASA control center."',
    color: "#4488ff",
    span: true,
  },
  {
    icon: Link2,
    title: "Onchain Intelligence",
    sources: "7 Chains: ETH · Base · Arbitrum · Optimism · Polygon · BSC · Avalanche",
    description:
      "Wallet profiling, transaction pattern analysis, scam detection, fund flow tracing, token holder concentration. Identified a live address-poisoning mule wallet from raw onchain data alone.",
    color: "#00ff88",
  },
  {
    icon: TrendingUp,
    title: "Competitive Intelligence",
    sources: "Website scraping · Pricing · Feature mapping",
    description:
      "Website scraping, pricing analysis, feature mapping, community sentiment. All competitor research routed through AXL — competitors never know you're analyzing them.",
    color: "#ffb700",
  },
  {
    icon: Globe,
    title: "Market Research",
    sources: "Full market landscape analysis",
    description:
      "Pricing models, feature matrices, hiring signals, HN/ProductHunt interest, go-to-market recommendations with confidence levels.",
    color: "#4488ff",
  },
  {
    icon: Zap,
    title: "Autonomous Monitoring",
    sources: "KeeperHub integration",
    description:
      "Create workflows that watch wallets, tokens, and DeFi protocols. When events fire, Nexis runs private research automatically and sends Telegram alerts.",
    color: "#00ff88",
  },
  {
    icon: ArrowRight,
    title: "Fund Flow Tracing",
    sources: "Multi-hop cross-chain analysis",
    description:
      "Follow money hop by hop across chains. Detect mixing patterns, exchange deposits, wallet clustering. Identify when the same entity controls multiple wallets.",
    color: "#ffb700",
  },
];

export default function CapabilitiesGrid() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 });

  return (
    <section className="py-24 px-6" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            Capabilities
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight">
            What Nexis Can Research
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((cap, idx) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
              className={`group relative p-7 rounded-2xl border border-border bg-card hover:border-[var(--nexis-accent-dim)] transition-all duration-300 overflow-hidden ${cap.span ? "md:col-span-2 lg:col-span-1" : ""}`}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `${cap.color}10`, transform: "translate(30%, -30%)" }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${cap.color}12`, border: `1px solid ${cap.color}20` }}
              >
                <cap.icon size={18} style={{ color: cap.color }} />
              </div>

              <h3 className="font-display font-semibold text-lg text-foreground mb-1.5">
                {cap.title}
              </h3>
              <p className="text-sm text-foreground/60 mb-3">{cap.sources}</p>
              <p className="text-base text-foreground/75 leading-relaxed">
                {cap.description}
              </p>

              {cap.quote && (
                <blockquote className="mt-5 pl-4 border-l-2 border-[var(--nexis-accent)] text-sm text-foreground/70 italic leading-relaxed">
                  {cap.quote}
                </blockquote>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
