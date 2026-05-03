import { motion } from "framer-motion";
import { ArrowRight, Github, Shield } from "lucide-react";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } },
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(0,255,136,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Radial fade at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, hsl(var(--background)))",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)] text-[var(--nexis-accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--nexis-accent)] animate-pulse" />
              Built for ETHGlobal OpenAgents 2026
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="font-display font-bold text-5xl sm:text-6xl md:text-7xl xl:text-8xl leading-[1.05] tracking-tight text-foreground"
          >
            The Private Data Layer
            <br />
            <span className="text-[var(--nexis-accent)]">for the Agentic Internet</span>
          </motion.h1>

          {/* Agent identity descriptor */}
          <motion.div variants={itemVariants} className="flex justify-center mt-6 mb-2">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.04] text-white/70 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--nexis-accent)]" />
              Private Research Agent
            </span>
          </motion.div>

          {/* Sub-headline */}
          <motion.p
            variants={itemVariants}
            className="mt-4 text-lg sm:text-xl text-foreground/80 max-w-3xl mx-auto leading-relaxed"
          >
            Any agent or human can research markets, wallets, communities, and
            competitors — without revealing their identity, intent, or strategy
            to anyone.
          </motion.p>

          {/* Supporting copy */}
          <motion.p
            variants={itemVariants}
            className="mt-4 text-sm text-foreground/60 max-w-2xl mx-auto leading-relaxed"
          >
            Every query you make leaves a trace. RPC providers log your wallet lookups.
            Search engines profile your research patterns. Nexis routes everything through
            Gensyn's AXL privacy network and stores results encrypted on 0G — so your
            research stays yours.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="/dashboard"
              data-testid="button-start-researching"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[var(--nexis-accent)] text-black font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,255,136,0.25)]"
            >
              Start Researching Free
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </a>
            <a
              href="https://github.com/0xZaid10/Nexis"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-github"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/15 bg-white/[0.04] text-foreground font-medium text-sm transition-all duration-200 hover:border-white/30 hover:bg-white/[0.08]"
            >
              <Github size={15} />
              View on GitHub ↗
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-xs text-foreground/50 flex items-center justify-center gap-2"
          >
            <Shield size={11} className="text-[var(--nexis-accent)]" />
            No account required for API
            <span className="text-foreground/25">·</span>
            5 free research runs
            <span className="text-foreground/25">·</span>
            Open source
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
