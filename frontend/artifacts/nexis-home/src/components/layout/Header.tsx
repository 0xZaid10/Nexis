import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Product", href: "/" },
  { label: "Privacy", href: "/privacy" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Docs", href: "/docs" },
];

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      <header
        className={[
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border"
            : "bg-transparent",
        ].join(" ")}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
          {/* Left — Nexis brand */}
          <div className="flex-none flex flex-col justify-center leading-none">
            <span
              data-testid="text-nexis-brand"
              className="font-display font-bold text-2xl tracking-tight text-foreground"
            >
              Nexis
            </span>
            <span className="text-[10px] text-foreground/50 tracking-widest uppercase mt-0.5">
              Private Research Agent
            </span>
          </div>

          {/* Center — Nav links */}
          <nav className="flex-1 hidden md:flex items-center justify-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href}>
                  <span
                    data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={[
                      "relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer",
                      active
                        ? "text-[var(--nexis-accent)]"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute inset-0 rounded-lg bg-[var(--nexis-accent-dim)]"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right — theme toggle + Open Dashboard */}
          <div className="flex-none flex items-center gap-3">
            <button
              onClick={toggleTheme}
              data-testid="button-toggle-theme"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </motion.span>
              </AnimatePresence>
            </button>

            <a
              href="/dashboard"
              data-testid="link-open-dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-border bg-card hover:border-[var(--nexis-accent)] hover:text-[var(--nexis-accent)] transition-all duration-200"
            >
              Open Dashboard
              <span className="text-[var(--nexis-accent)]">→</span>
            </a>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              onClick={() => setMobileOpen((v) => !v)}
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border p-4 md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href}>
                    <span
                      className={[
                        "block px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200",
                        active
                          ? "text-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {link.label}
                    </span>
                  </Link>
                );
              })}
              <a
                href="/dashboard"
                className="mt-2 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--nexis-accent)] text-[var(--nexis-accent)]"
              >
                Open Dashboard →
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
