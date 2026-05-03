import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { UserButton, useUser } from "@clerk/react";
import { useTheme } from "@/lib/theme";
import {
  FlaskConical, History, Link2, Shield, Settings,
  LogIn, UserX, Sun, Moon,
} from "lucide-react";

const navItems = [
  { label: "New Research", href: "/research/new", icon: FlaskConical },
  { label: "Sessions",     href: "/sessions",      icon: History    },
  { label: "Onchain",      href: "/onchain",        icon: Link2      },
  { label: "KeeperHub",    href: "/keeperhub",      icon: Shield     },
  { label: "Settings",     href: "/settings",       icon: Settings   },
];

interface SidebarProps {
  isGuest?: boolean;
  onExitGuest?: () => void;
}

export default function Sidebar({ isGuest, onExitGuest }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { theme, toggle } = useTheme();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  function isActive(href: string) {
    if (href === "/research/new") return location === "/" || location === "/research/new";
    return location.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col bg-sidebar border-r border-sidebar-border z-40">

      {/* Logo */}
      <div className="flex flex-col px-5 pt-4 pb-3.5 border-b border-sidebar-border shrink-0 gap-1">
        <div className="flex items-center">
          <span className="text-base font-bold tracking-tight text-foreground select-none">
            Nexis
          </span>
          <div className="ml-2 w-1.5 h-1.5 rounded-full bg-nexis-green shrink-0" />
        </div>
        <span className="text-[11px] text-foreground/60 tracking-wide select-none leading-none">
          Private Research Agent
        </span>
      </div>

      {/* Agent status pill */}
      <div className="mx-2.5 mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-nexis-green/[0.05] border border-nexis-green/10">
        <span className="relative flex shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-nexis-green opacity-40 animate-ping" style={{ animationDuration: "3s" }} />
          <span className="relative w-1.5 h-1.5 rounded-full bg-nexis-green" />
        </span>
        <span className="text-xs text-nexis-green/80 font-mono">Agent online</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 mt-1 space-y-px">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && (
                <span className="ml-auto w-1 h-1 rounded-full bg-nexis-green" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border shrink-0 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 shrink-0" />
            : <Moon className="w-4 h-4 shrink-0" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {/* User */}
        {isGuest ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                <UserX className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Guest</p>
                <p className="text-[10px] text-muted-foreground">Not signed in</p>
              </div>
            </div>
            <Link
              href={`${basePath}/sign-in`}
              className="flex items-center justify-center gap-2 w-full text-xs font-medium bg-nexis-green/10 hover:bg-nexis-green/15 text-nexis-green px-3 py-2 rounded-md transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <UserButton
              afterSignOutUrl={import.meta.env.BASE_URL}
              appearance={{ elements: { avatarBox: "w-7 h-7", userButtonTrigger: "focus:shadow-none" } }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
