import { Switch, Route, Router as WouterRouter } from "wouter";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/react";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/lib/theme";
import DashboardLayout from "@/components/layout/DashboardLayout";
import NewResearch from "@/pages/research/NewResearch";
import Sessions from "@/pages/sessions/Sessions";
import SessionDetail from "@/pages/sessions/SessionDetail";
import Onchain from "@/pages/onchain/Onchain";
import KeeperHub from "@/pages/keeperhub/KeeperHub";
import Settings from "@/pages/settings/Settings";
import Landing from "@/pages/Landing";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const GUEST_KEY = "nexis_guest_mode";

const clerkAppearanceDark = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#10b981",
    colorBackground: "#0f0f0f",
    colorInputBackground: "#161616",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#a3a3a3",
    colorNeutral: "#a3a3a3",
    borderRadius: "0.5rem",
    fontFamily: "'Geist', -apple-system, sans-serif",
    fontSize: "14px",
  },
  elements: {
    card: "bg-[#111] border border-[#232323] shadow-xl",
    headerTitle: "text-white",
    headerSubtitle: "text-[#a3a3a3]",
    bodyText: "text-white",
    bodyTextAction: "text-emerald-400",
    formButtonPrimary: "bg-emerald-600 hover:bg-emerald-500 text-white font-medium",
    footerActionLink: "text-emerald-400 hover:text-emerald-300",
    footerActionText: "text-[#a3a3a3]",
    formFieldLabel: "text-[#d4d4d4]",
    formFieldInput: "bg-[#161616] border-[#2a2a2a] text-white placeholder:text-[#525252] focus:border-emerald-600",
    formFieldHintText: "text-[#737373]",
    formFieldErrorText: "text-red-400",
    socialButtonsBlockButton: "border-[#2a2a2a] bg-[#161616] hover:bg-[#1e1e1e] text-white",
    socialButtonsBlockButtonText: "text-white font-medium",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-emerald-400 hover:text-emerald-300",
    alternativeMethodsBlockButton: "text-white border-[#2a2a2a] bg-[#161616] hover:bg-[#1e1e1e]",
    dividerLine: "bg-[#232323]",
    dividerText: "text-[#525252]",
    otpCodeFieldInput: "text-white bg-[#161616] border-[#2a2a2a]",
    formResendCodeLink: "text-emerald-400 hover:text-emerald-300",
  },
};

const clerkAppearanceLight = {
  variables: {
    colorPrimary: "#059669",
    colorBackground: "#ffffff",
    colorInputBackground: "#fafafa",
    colorInputText: "#171717",
    colorText: "#171717",
    colorTextSecondary: "#737373",
    borderRadius: "0.5rem",
    fontFamily: "'Geist', -apple-system, sans-serif",
    fontSize: "14px",
  },
  elements: {
    card: "bg-white border border-[#e5e5e5] shadow-lg",
    formButtonPrimary: "bg-emerald-600 hover:bg-emerald-500 text-white font-medium",
    footerActionLink: "text-emerald-600 hover:text-emerald-500",
    formFieldInput: "bg-[#fafafa] border-[#e5e5e5] text-[#171717] focus:border-emerald-600",
    formFieldLabel: "text-[#525252]",
    socialButtonsBlockButton: "border-[#e5e5e5] bg-white hover:bg-[#f5f5f5] text-[#171717]",
    dividerLine: "bg-[#e5e5e5]",
    dividerText: "text-[#a3a3a3]",
  },
};

function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isGuest, setIsGuest] = useState(() => sessionStorage.getItem(GUEST_KEY) === "1");

  if (!isLoaded && !isGuest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-nexis-green animate-spin" />
      </div>
    );
  }

  if (!isSignedIn && !isGuest) {
    return (
      <Landing onContinueAsGuest={() => {
        sessionStorage.setItem(GUEST_KEY, "1");
        setIsGuest(true);
      }} />
    );
  }

  return (
    <DashboardLayout
      isGuest={isGuest && !isSignedIn}
      onExitGuest={() => {
        sessionStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
      }}
    >
      <Switch>
        <Route path="/" component={NewResearch} />
        <Route path="/research/new" component={NewResearch} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/sessions/:id" component={SessionDetail} />
        <Route path="/onchain" component={Onchain} />
        <Route path="/keeperhub" component={KeeperHub} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="flex items-center justify-center h-full text-muted-foreground py-32 text-sm">
            Page not found.
          </div>
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

function InnerApp() {
  const { theme } = useTheme();
  const clerkAppearance = theme === "dark" ? clerkAppearanceDark : clerkAppearanceLight;

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      afterSignOutUrl={`${basePath}/`}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Switch>
              <Route component={AuthGate} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <InnerApp />
    </ThemeProvider>
  );
}
