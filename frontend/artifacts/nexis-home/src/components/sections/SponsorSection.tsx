import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";

const SPONSORS = [
  {
    name: "Gensyn AXL",
    abbr: "AXL",
    color: "#00ff88",
    description:
      "Every single outbound request from Nexis is routed through Gensyn's AXL peer-to-peer encrypted mesh. Not selected requests — all of them. Your IP never touches a data provider.",
  },
  {
    name: "0G Storage",
    abbr: "0G",
    color: "#4488ff",
    description:
      "Research results encrypted with AES-256 and stored on 0G's decentralized network. Root hash anchored on-chain. Only you hold the decryption key. Only you can read your research.",
  },
  {
    name: "KeeperHub",
    abbr: "KH",
    color: "#ffb700",
    description:
      "Autonomous onchain monitoring. Nexis creates KeeperHub workflows that watch wallets, tokens, and DeFi protocols 24/7 — triggering private research automatically when conditions are met.",
  },
  {
    name: "ETHGlobal",
    abbr: "ETH",
    color: "#9b59b6",
    description:
      "Built for ETHGlobal OpenAgents 2026 — the first hackathon focused on building for the agentic internet.",
  },
];

export default function SponsorSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="py-24 px-6 bg-muted/10 border-y border-border" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            Infrastructure
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight">
            Built on the Best Infrastructure
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SPONSORS.map((sponsor, idx) => (
            <motion.div
              key={sponsor.name}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="group p-7 rounded-2xl border border-border bg-card hover:border-[var(--nexis-accent-dim)] transition-all duration-300"
              data-testid={`sponsor-card-${sponsor.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {/* Logo placeholder */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 font-display font-bold text-sm"
                style={{
                  background: `${sponsor.color}12`,
                  border: `1px solid ${sponsor.color}25`,
                  color: sponsor.color,
                }}
              >
                {sponsor.abbr}
              </div>

              <h3 className="font-display font-semibold text-lg text-foreground mb-3">
                {sponsor.name}
              </h3>
              <p className="text-base text-foreground/75 leading-relaxed">
                {sponsor.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
