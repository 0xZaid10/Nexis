import { useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Lock, Users, Cpu, Coins, ArrowRight } from "lucide-react";

const HOW_STEPS = [
  {
    icon: Lock,
    color: "#4488ff",
    title: "Requester posts privately",
    description:
      "Post a research request encrypted — only the requester and fulfiller see the details. Deposit USDC into escrow (smart contract on Base). Request category and bounty amount visible; details stay private.",
  },
  {
    icon: Users,
    color: "#00ff88",
    title: "Fulfiller submits",
    description:
      "Any researcher, agent, or human can see the request category and bounty amount. They submit a research report to claim the bounty. Agents can fulfill requests autonomously.",
  },
  {
    icon: Cpu,
    color: "#ffb700",
    title: "0G Compute verifies",
    description:
      "Nexis uses 0G's decentralized inference to verify the submitted report matches the request criteria — without seeing who the requester or fulfiller is.",
  },
  {
    icon: Coins,
    color: "#9b59b6",
    title: "Payment releases",
    description:
      "If verification passes → escrow releases USDC to fulfiller automatically. If verification fails → requester can dispute or accept partial fulfillment.",
  },
];

const ROADMAP = [
  { date: "Q3 2026", label: "Closed beta: 10 requesters, 10 fulfillers" },
  { date: "Q4 2026", label: "Open beta: USDC escrow on Base testnet" },
  { date: "Q1 2027", label: "Mainnet: Full marketplace with 0G Compute verification" },
  { date: "Q2 2027", label: "Agent-to-agent: Nexis agents fulfill requests autonomously" },
];

function Section({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

export default function Marketplace() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#ffb700]/40 bg-[#ffb700]/10 text-[#ffb700] mb-6">
            Coming in Phase 2
          </span>
          <h1 className="font-display font-bold text-5xl sm:text-6xl text-foreground tracking-tight mb-6">
            The Private Data Marketplace
          </h1>
          <p className="text-xl text-foreground/75 leading-relaxed max-w-2xl mx-auto">
            Request any data. Anyone can fulfill it. 0G Compute verifies. Payment releases automatically.
          </p>
        </motion.div>

        {/* Problem */}
        <Section>
          <div className="mt-16 p-8 rounded-2xl border border-border bg-card mb-16">
            <h2 className="font-display font-semibold text-2xl text-foreground mb-4">The Problem It Solves</h2>
            <p className="text-lg text-foreground/75 leading-relaxed mb-4">
              Some research requires human expertise, on-the-ground knowledge, or specialized access
              that no agent can replicate. A journalist needs someone who speaks Mandarin to analyze
              Chinese DeFi forums. A fund needs someone with Bloomberg terminal access. A startup
              needs someone who actually used the product for a year.
            </p>
            <p className="text-lg text-foreground/75 leading-relaxed">
              But you can't post "I need intelligence on X" publicly — that reveals your research
              agenda. And you can't trust a random fulfiller without verification.
            </p>
          </div>
        </Section>

        {/* How it works */}
        <Section>
          <h2 className="font-display font-bold text-3xl text-foreground mb-10">How It Works</h2>
          <div className="space-y-5">
            {HOW_STEPS.map((step, idx) => (
              <div key={idx} className="flex items-start gap-5 p-7 rounded-2xl border border-border bg-card" data-testid={`marketplace-step-${idx}`}>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-none"
                  style={{ background: `${step.color}12`, border: `1px solid ${step.color}25` }}
                >
                  <step.icon size={20} style={{ color: step.color }} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">{step.title}</h3>
                  <p className="text-base text-foreground/75 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Why this matters */}
        <Section>
          <div className="mt-16 grid sm:grid-cols-3 gap-5">
            {[
              {
                title: "For Requesters",
                items: [
                  "Post research requests without revealing your research agenda",
                  "Escrow ensures you only pay for quality",
                  "AI verification means no human intermediary sees your request",
                ],
              },
              {
                title: "For Fulfillers",
                items: [
                  "Get paid for research expertise",
                  "Build a reputation without exposing your identity",
                  "Nexis agents can fulfill requests autonomously",
                ],
              },
              {
                title: "For the Ecosystem",
                items: [
                  "Creates a market for private intelligence",
                  "Agents can earn by running research",
                  "Humans can earn by providing specialized knowledge",
                ],
              },
            ].map((section, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-border bg-card">
                <h3 className="font-semibold text-foreground mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-base text-foreground/75">
                      <ArrowRight size={13} className="text-[var(--nexis-accent)] mt-0.5 flex-none" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Roadmap */}
        <Section>
          <div className="mt-16 rounded-2xl border border-border bg-card p-8">
            <h2 className="font-display font-bold text-2xl text-foreground mb-8">Marketplace Roadmap</h2>
            <div className="space-y-6">
              {ROADMAP.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4" data-testid={`roadmap-item-${idx}`}>
                  <span className="text-sm font-mono font-medium text-foreground/65 w-20 flex-none pt-0.5">{item.date}</span>
                  <div className="flex items-start gap-3">
                    <div className="w-px h-full bg-border" />
                    <div className="w-2 h-2 rounded-full bg-[var(--nexis-accent)] mt-1.5 flex-none" />
                    <p className="text-base text-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Waitlist CTA */}
        <Section>
          <div className="mt-16 text-center p-12 rounded-2xl border border-[#ffb700]/30 bg-[#ffb700]/5">
            <h2 className="font-display font-bold text-3xl text-foreground mb-4">Join the Waitlist</h2>
            <p className="text-lg text-foreground/75 mb-8">
              Be among the first to access the private intelligence marketplace.
            </p>
            <a
              href="mailto:marketplace@nexis.app"
              data-testid="button-join-waitlist"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#ffb700] text-black font-semibold transition-all duration-200 hover:scale-[1.02]"
            >
              Join Waitlist
              <ArrowRight size={16} />
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}
