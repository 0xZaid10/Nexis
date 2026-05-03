import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const ROWS = [
  { label: "Private queries", chainalysis: false, nansen: false, arkham: false, nexis: true },
  { label: "Encrypted results", chainalysis: false, nansen: false, arkham: false, nexis: true },
  { label: "Agent-native API", chainalysis: false, nansen: false, arkham: false, nexis: true },
  { label: "Autonomous triggering", chainalysis: false, nansen: false, arkham: false, nexis: true },
  { label: "Multi-source intelligence", chainalysis: false, nansen: false, arkham: false, nexis: true },
  { label: "Free / open", chainalysis: false, nansen: false, arkham: "partial", nexis: true },
  { label: "Cost", chainalysis: "$100k+/yr", nansen: "$150/mo", arkham: "Freemium", nexis: "Free" },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={16} className="text-[var(--nexis-accent)] mx-auto" />
    ) : (
      <X size={16} className="text-[#ff4466] mx-auto" />
    );
  }
  return <span className="text-sm text-foreground/70">{value}</span>;
}

export default function ComparisonTable() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="py-24 px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <p className="text-xs font-semibold tracking-widest text-[var(--nexis-accent)] uppercase mb-4">
            Why Nexis
          </p>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-foreground tracking-tight">
            The Only Tool Built for Privacy
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto rounded-2xl border border-border"
        >
          <table className="w-full" data-testid="comparison-table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-4 text-sm font-semibold text-foreground/70 uppercase tracking-wider w-1/3">
                  Feature
                </th>
                {["Chainalysis", "Nansen", "Arkham"].map((h) => (
                  <th key={h} className="px-4 py-4 text-center text-sm font-medium text-foreground/65">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-4 text-center text-sm font-semibold text-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)] rounded-t-sm">
                  Nexis
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, idx) => (
                <tr
                  key={row.label}
                  className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/30"}`}
                >
                  <td className="px-6 py-4 text-sm text-foreground font-medium">{row.label}</td>
                  <td className="px-4 py-4 text-center"><Cell value={row.chainalysis} /></td>
                  <td className="px-4 py-4 text-center"><Cell value={row.nansen} /></td>
                  <td className="px-4 py-4 text-center"><Cell value={row.arkham} /></td>
                  <td className="px-4 py-4 text-center bg-[var(--nexis-accent-dim)]">
                    {row.label === "Cost" ? (
                      <span className="text-sm font-semibold text-[var(--nexis-accent)]">Free</span>
                    ) : (
                      <Cell value={row.nexis} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-center text-base text-foreground/75"
        >
          Chainalysis would have told you about that scam wallet. For{" "}
          <span className="text-foreground font-medium">$100,000/year</span>. Nexis told you{" "}
          <span className="text-[var(--nexis-accent)] font-medium">for free</span>. Privately.
        </motion.p>
      </div>
    </section>
  );
}
