import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Home from "@/pages/Home";
import Privacy from "@/pages/Privacy";
import UseCases from "@/pages/UseCases";
import Marketplace from "@/pages/Marketplace";
import Docs from "@/pages/Docs";

const queryClient = new QueryClient();

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/use-cases" component={UseCases} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/docs" component={Docs} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WouterRouter base={BASE}>
          <Router />
        </WouterRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
