import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const PHASES = [
  { phase: "Phase 1", label: "Private Research Agent", current: true },
  { phase: "Phase 2", label: "Private Data Marketplace", current: false },
  { phase: "Phase 3", label: "Agent-to-Agent Economy", current: false },
];

export default function VisionSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

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
            The Vision
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight">
            We're Building the Privacy Layer
            <br />
            the Agentic Internet Needs
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="space-y-5 text-lg text-foreground/75 leading-relaxed mb-16"
        >
          <p>
            In 2025, there are more AI agents than humans querying the internet. They're
            trading, researching, monitoring, and deciding — continuously, at scale.
          </p>
          <p>Every one of them leaves a trail.</p>
          <p>
            The agentic internet needs a privacy layer. Not a VPN. Not a proxy. A
            purpose-built primitive that lets agents access data, pay for it, and store
            results — without revealing who they are or what they're doing.
          </p>
          <p>
            Nexis is that layer. We started with research intelligence. We're building
            toward a world where any agent can privately access any data, and any human
            can research anything without creating a surveillance record.
          </p>
        </motion.div>

        {/* Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-8"
        >
          <p className="text-sm font-semibold tracking-widest text-foreground/55 uppercase mb-8">
            Roadmap
          </p>

          <div className="space-y-0">
            {PHASES.map((phase, idx) => (
              <div key={phase.phase} className="flex items-start gap-5">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      "w-8 h-8 rounded-full flex items-center justify-center border-2 flex-none",
                      phase.current
                        ? "bg-[var(--nexis-accent)] border-[var(--nexis-accent)]"
                        : "bg-card border-border",
                    ].join(" ")}
                  >
                    {phase.current ? (
                      <MapPin size={13} className="text-black" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-border" />
                    )}
                  </div>
                  {idx < PHASES.length - 1 && (
                    <div className="w-px h-12 bg-border mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-12 last:pb-0">
                  <p className="text-sm text-foreground/55 mb-1">{phase.phase}</p>
                  <p
                    className={`font-display font-semibold text-lg ${
                      phase.current ? "text-[var(--nexis-accent)]" : "text-foreground/60"
                    }`}
                  >
                    {phase.label}
                  </p>
                  {phase.current && (
                    <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-[var(--nexis-accent-dim)] text-[var(--nexis-accent)] font-medium">
                      ← You are here
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
