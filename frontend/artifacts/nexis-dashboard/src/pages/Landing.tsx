import { SignInButton, SignUpButton } from "@clerk/react";
import { ArrowRight, Shield, Zap, Link2, FlaskConical } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

const features = [
  { icon: FlaskConical, label: "AI Research",        desc: "Deep intelligence on any crypto target" },
  { icon: Shield,       label: "Privacy Proofs",     desc: "ZK-verified, tamper-proof audit trails" },
  { icon: Link2,        label: "Onchain Analytics",  desc: "Real-time blockchain data and risk scoring" },
  { icon: Zap,          label: "KeeperHub",          desc: "Monitor and manage keeper nodes" },
];

interface LandingProps {
  onContinueAsGuest: () => void;
}

export default function Landing({ onContinueAsGuest }: LandingProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-5 right-5 p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="max-w-md w-full text-center space-y-8">
        {/* Brand */}
        <div className="space-y-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg font-semibold text-foreground tracking-tight">Nexis</span>
            <div className="w-1.5 h-1.5 rounded-full bg-nexis-green" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-foreground leading-tight tracking-tight">
              Intelligence for<br />onchain reality
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Privacy-first AI research and blockchain intelligence.
              Analyze wallets, contracts, and protocols with ZK-verified proofs.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2.5 text-left">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="border border-border bg-card rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-nexis-green" />
                <span className="text-xs font-medium text-foreground">{label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <div className="flex gap-2.5">
            <SignInButton mode="modal">
              <button className="flex-1 inline-flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 text-background font-medium px-5 py-2.5 rounded-lg transition-colors text-sm cursor-pointer">
                Sign in
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="flex-1 inline-flex items-center justify-center border border-border bg-card hover:bg-secondary text-foreground px-5 py-2.5 rounded-lg transition-colors text-sm cursor-pointer">
                Create account
              </button>
            </SignUpButton>
          </div>
          <button
            onClick={onContinueAsGuest}
            className="w-full inline-flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Continue without an account →
          </button>
        </div>

        <p className="text-xs text-muted-foreground/50">
          5 free research runs per IP · No credit card required
        </p>
      </div>
    </div>
  );
}
