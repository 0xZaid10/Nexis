import { Link } from "wouter";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="font-display font-bold text-xl text-foreground">Nexis</span>
            <p className="mt-3 text-sm text-foreground/70 leading-relaxed">
              Private Data Layer for the Agentic Internet.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://github.com/0xZaid10/Nexis"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-github"
                className="p-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-muted transition-all duration-200"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
              <a
                href="https://twitter.com/0x_Zaid10"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-twitter"
                className="p-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-muted transition-all duration-200"
                aria-label="Twitter"
              >
                <Twitter size={16} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Architecture", href: "/privacy" },
                { label: "Use Cases", href: "/use-cases" },
                { label: "Marketplace", href: "/marketplace" },
                { label: "Open Dashboard", href: "/dashboard" },
              ].map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("/dashboard") ? (
                    <a
                      href={link.href}
                      className="text-sm text-foreground/60 hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href}>
                      <span className="text-sm text-foreground/60 hover:text-foreground transition-colors duration-200 cursor-pointer">
                        {link.label}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Developers</h4>
            <ul className="space-y-2.5">
              {[
                { label: "API Docs", href: "/docs" },
                { label: "GitHub ↗", href: "https://github.com/0xZaid10/Nexis", external: true },
              ].map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/60 hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href}>
                      <span className="text-sm text-foreground/60 hover:text-foreground transition-colors duration-200 cursor-pointer">
                        {link.label}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Infrastructure */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Infrastructure</h4>
            <ul className="space-y-2.5">
              {["Gensyn AXL", "0G Storage", "KeeperHub", "ETHGlobal OpenAgents"].map((label) => (
                <li key={label}>
                  <span className="text-sm text-foreground/60">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-foreground/55">
            MIT License · Open Source · Built for ETHGlobal OpenAgents 2026
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-foreground/55">Powered by</span>
            <span className="text-xs font-medium text-foreground">Gensyn AXL</span>
            <span className="text-xs text-foreground/40">·</span>
            <span className="text-xs font-medium text-foreground">0G Storage</span>
            <span className="text-xs text-foreground/40">·</span>
            <span className="text-xs font-medium text-foreground">KeeperHub</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-foreground/55">
          Made by{" "}
          <a
            href="https://twitter.com/0x_Zaid10"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--nexis-accent)] hover:underline"
          >
            @0x_Zaid10
          </a>
        </p>
      </div>
    </footer>
  );
}
