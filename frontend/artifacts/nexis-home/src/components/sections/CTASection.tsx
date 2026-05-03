import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function CTASection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className="py-24 px-6 relative overflow-hidden" ref={ref}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,255,136,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 grid-bg opacity-40" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-foreground tracking-tight mb-6">
            Start Researching{" "}
            <span className="text-[var(--nexis-accent)]">Privately</span>
          </h2>
          <p className="text-xl text-foreground/75 mb-10">
            5 free research runs. No credit card. Open source.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/dashboard"
              data-testid="button-cta-dashboard"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--nexis-accent)] text-black font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(0,255,136,0.25)]"
            >
              Open Dashboard
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </a>
            <Link href="/docs">
              <span
                data-testid="button-cta-docs"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/15 bg-white/[0.04] text-foreground font-medium transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08] cursor-pointer"
              >
                Read the Docs
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
