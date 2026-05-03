import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { MessageSquare, Shield, Cpu, Database } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Query",
    description:
      `You or your agent submits a research goal in natural language. "Analyze this wallet." "Find pain points about Notion." "Research the EV market."`,
    color: "#4488ff",
  },
  {
    number: "02",
    icon: Shield,
    title: "AXL Routes Privately",
    description:
      "Every outbound request — RPC calls, Reddit scraping, GitHub API, Etherscan — is routed through Gensyn's AXL peer-to-peer privacy network. Data providers see AXL, not you.",
    color: "#00ff88",
  },
  {
    number: "03",
    icon: Cpu,
    title: "Intelligence Synthesized",
    description:
      "Nexis runs multi-source research: community analysis across Reddit/GitHub/HN/Web, onchain intelligence across 7 chains, competitive scraping, and LLM synthesis — with semantic clustering and evidence anchoring.",
    color: "#ffb700",
  },
  {
    number: "04",
    icon: Database,
    title: "Encrypted to 0G",
    description:
      "Results are encrypted with AES-256 using a key that never leaves your machine. The encrypted blob is stored on 0G's decentralized network. Root hash anchored on-chain. Only you can decrypt.",
    color: "#4488ff",
  },
];

export default function HowItWorks() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="py-24 px-6 bg-muted/20" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            How It Works
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight">
            Private by Design. Powerful by Default.
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="relative"
              >
                {/* Icon only — no step number */}
                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 bg-card border border-border"
                    style={{ boxShadow: `0 0 0 4px hsl(var(--background))` }}
                  >
                    <step.icon size={20} style={{ color: step.color }} />
                  </div>
                </div>

                <h3 className="font-display font-semibold text-xl text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-foreground/75 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
