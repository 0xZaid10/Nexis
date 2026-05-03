import { useRef } from "react";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Eye, Bot, Lock } from "lucide-react";

const COLUMNS = [
  {
    icon: Eye,
    title: "For Humans",
    color: "#4488ff",
    text: "A hedge fund analyst researching a competitor doesn't want that competitor to know. A journalist investigating a whale wallet can't tip them off. A patient researching a diagnosis doesn't want that data sold to insurers.\n\nEvery query to Nansen, Dune, or any data provider is logged. They know who you are and what you're researching.",
  },
  {
    icon: Bot,
    title: "For AI Agents",
    color: "#ffb700",
    text: "As AI agents proliferate — trading, researching, monitoring, deciding — they need data continuously. Every agent API call is logged, tracked, and profiled.\n\nA trading agent that queries price feeds reveals its strategy. A research agent querying competitors reveals its company's roadmap. The infrastructure your agent depends on is watching everything.",
  },
  {
    icon: Lock,
    title: "The Gap",
    color: "#00ff88",
    text: "No existing tool combines intelligence + privacy + decentralization for live queries.\n\nChainalysis requires identity verification. Nansen logs your sessions. Arkham builds profiles on researchers. Nexis is the first private data access layer that works for both humans and agents.",
  },
];

export default function ProblemSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section className="py-24 px-6 relative" ref={ref}>
      {/* Subtle top separator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-border" />

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            The Problem
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight">
            Every Query You Make
            <br />
            Is Being Watched
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col, idx) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="group relative p-8 rounded-2xl border border-border bg-card hover:border-[var(--nexis-accent-dim)] transition-all duration-300 overflow-hidden"
            >
              {/* Background glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${col.color}08 0%, transparent 70%)`,
                }}
              />

              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
                style={{ background: `${col.color}12`, border: `1px solid ${col.color}25` }}
              >
                <col.icon size={20} style={{ color: col.color }} />
              </div>

              <h3 className="font-display font-semibold text-xl text-foreground mb-4">
                {col.title}
              </h3>

              {col.text.split("\n\n").map((para, i) => (
                <p key={i} className={`text-sm text-foreground/75 leading-relaxed ${i > 0 ? "mt-3" : ""}`}>
                  {para}
                </p>
              ))}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
