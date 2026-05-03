import { Link } from "wouter";
import Sidebar from "./Sidebar";
import { ArrowRight } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  isGuest?: boolean;
  onExitGuest?: () => void;
}

export default function DashboardLayout({ children, isGuest, onExitGuest }: DashboardLayoutProps) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isGuest={isGuest} onExitGuest={onExitGuest} />
      <main className="flex-1 ml-[220px] h-screen overflow-y-auto flex flex-col">
        {isGuest && (
          <div className="shrink-0 flex items-center justify-between gap-4 px-5 py-2 bg-amber-500/5 border-b border-amber-500/15 text-xs">
            <span className="text-amber-600 dark:text-amber-400">
              Browsing as guest — session data won't be saved.
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`${basePath}/sign-up`}
                className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium hover:underline transition-colors"
              >
                Create account <ArrowRight className="w-3 h-3" />
              </Link>
              <span className="text-border">·</span>
              <button
                onClick={onExitGuest}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
