import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";

const STATS = [
  { value: "247+", label: "Sessions", sub: "Completed" },
  { value: "7", label: "Chains", sub: "Analyzed" },
  { value: "47+", label: "0G Sessions", sub: "Stored" },
  { value: "90%", label: "Scam Detection", sub: "Confidence" },
];

export default function LiveStats() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className="py-20 px-6 bg-muted/10 border-y border-border" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-12"
        >
          Running in Production
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="text-center"
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="font-display font-bold text-5xl md:text-6xl text-foreground tracking-tight mb-1">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-foreground mb-0.5">{stat.label}</div>
              <div className="text-sm text-foreground/60">{stat.sub}</div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 text-center text-sm text-foreground/65"
        >
          All routed via Gensyn AXL
          <span className="mx-2 text-foreground/30">·</span>
          All encrypted on 0G
          <span className="mx-2 text-foreground/30">·</span>
          All open source
        </motion.p>
      </div>
    </section>
  );
}
