import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronRight } from "lucide-react";

type Tab = "curl" | "typescript" | "python";

const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick Start" },
  { id: "research-api", label: "Research API" },
  { id: "keeperhub-api", label: "KeeperHub API" },
  { id: "health-api", label: "Health API" },
  { id: "goal-examples", label: "Goal Examples" },
];

const API_BASE = "http://34.163.214.137:3000";

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative rounded-xl border border-border bg-[#0d0d0d] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[#111111]">
        <span className="text-xs text-foreground/50 font-mono">{lang}</span>
        <button onClick={copy} data-testid="button-copy-code"
          className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
          {copied ? <Check size={11} className="text-[var(--nexis-accent)]" /> : <Copy size={11} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-5 text-sm font-mono text-foreground overflow-x-auto leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function CopyBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground transition-colors px-3 py-2.5">
      {copied ? <Check size={11} className="text-[var(--nexis-accent)]" /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function TabCodeBlock({ tabs }: { tabs: Record<Tab, string> }) {
  const [active, setActive] = useState<Tab>("curl");
  const tabLabels: { key: Tab; label: string }[] = [
    { key: "curl", label: "curl" },
    { key: "typescript", label: "TypeScript" },
    { key: "python", label: "Python" },
  ];
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-[#0d0d0d]">
      <div className="flex items-center gap-0 border-b border-border bg-[#111111]">
        {tabLabels.map((t) => (
          <button key={t.key} onClick={() => setActive(t.key)} data-testid={`tab-${t.key}`}
            className={["px-4 py-2.5 text-xs font-medium transition-all duration-200 border-b-2",
              active === t.key
                ? "text-[var(--nexis-accent)] border-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)]"
                : "text-foreground/55 border-transparent hover:text-foreground",
            ].join(" ")}>{t.label}</button>
        ))}
        <div className="flex-1" />
        <CopyBtn code={tabs[active]} />
      </div>
      <pre className="p-5 text-sm font-mono text-foreground overflow-x-auto leading-relaxed"><code>{tabs[active]}</code></pre>
    </div>
  );
}

function EndpointTag({ method }: { method: "POST" | "GET" }) {
  const colors = method === "POST"
    ? "bg-[#4488ff]/15 text-[#4488ff] border-[#4488ff]/25"
    : "bg-[#00ff88]/10 text-[var(--nexis-accent)] border-[var(--nexis-accent)]/25";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold border ${colors}`}>{method}</span>;
}

const RESEARCH_SYNC_TABS: Record<Tab, string> = {
  curl: `curl -s -X POST ${API_BASE}/api/research/sync \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "goal": "Find pain points about Notion as a productivity tool",\n    "userId": "user-123"\n  }'`,
  typescript: `const response = await fetch('${API_BASE}/api/research/sync', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    goal: 'Find pain points about Notion as a productivity tool',\n    userId: 'user-123',\n  }),\n});\nconst data = await response.json();\n// data.summary — full Markdown report\n// data.results — array of capability results\n// data.storage.rootHash — 0G proof\n// data.routedViaAXL — privacy confirmation`,
  python: `import requests\n\nresponse = requests.post('${API_BASE}/api/research/sync', json={\n    'goal': 'Find pain points about Notion as a productivity tool',\n    'userId': 'user-123',\n})\ndata = response.json()\n# data['summary'] — full Markdown report\n# data['results'] — list of capability results\n# data['storage']['rootHash'] — 0G proof\n# data['routedViaAXL'] — privacy confirmation`,
};

const SESSIONS_TABS: Record<Tab, string> = {
  curl: `curl -s "${API_BASE}/api/research/sessions/user-123"`,
  typescript: `const response = await fetch(\n  '${API_BASE}/api/research/sessions/user-123'\n);\nconst { sessions, total } = await response.json();`,
  python: `import requests\nr = requests.get('${API_BASE}/api/research/sessions/user-123')\ndata = r.json()\nsessions = data['sessions']`,
};

const KEEPER_WHALE_TABS: Record<Tab, string> = {
  curl: `curl -s -X POST ${API_BASE}/api/keeper/create-monitor \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "type": "whale",\n    "target": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",\n    "threshold": 5,\n    "telegramChatId": "1380307827"\n  }'`,
  typescript: `const response = await fetch('${API_BASE}/api/keeper/create-monitor', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    type: 'whale',\n    target: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',\n    threshold: 5,\n    telegramChatId: '1380307827',\n  }),\n});\nconst data = await response.json();\n// data.data.workflow_id — KeeperHub workflow ID`,
  python: `import requests\nr = requests.post('${API_BASE}/api/keeper/create-monitor', json={\n    'type': 'whale',\n    'target': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',\n    'threshold': 5,\n    'telegramChatId': '1380307827',\n})\nprint(r.json()['data']['workflow_id'])`,
};

const GOAL_EXAMPLES = [
  {
    category: "Wallet Intelligence",
    examples: [
      "Analyze wallet 0x49CAdA74991C0090AF0be3FD387B17f1Da9d903D",
      "Is this wallet a scam? 0x...",
      "What kind of trader is 0xd8dA6BF...?",
      "Trace fund flows from 0x... across 3 hops",
    ],
  },
  {
    category: "Community Research",
    examples: [
      "Find pain points about Notion as a productivity tool",
      "Research DeFi privacy tools — what are users complaining about?",
      "What makes Tesla owners consider switching to competitors?",
      "Find complaints about Aave on Reddit and GitHub",
    ],
  },
  {
    category: "Market Research",
    examples: [
      "Research the EV market — Tesla vs Rivian vs Lucid",
      "Competitive analysis: who are Notion's main competitors and their weaknesses?",
      "What is the DeFi lending market landscape on Ethereum?",
    ],
  },
  {
    category: "Autonomous Monitoring",
    examples: [
      "Monitor wallet 0x... and alert me if it moves 50+ ETH",
      "Watch Aave protocol for large deposits",
      "Schedule weekly research on DeFi privacy tools",
    ],
  },
];

export default function Docs() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 flex-none pt-20 pb-16 pl-6 pr-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <p className="text-xs font-semibold text-foreground/55 uppercase tracking-wider mb-4 px-3">
            API Reference
          </p>
          <nav className="space-y-0.5">
            {NAV_SECTIONS.map((s) => (
              <button key={s.id} onClick={() => scrollTo(s.id)} data-testid={`sidebar-link-${s.id}`}
                className={["w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left",
                  activeSection === s.id
                    ? "text-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)]"
                    : "text-foreground/65 hover:text-foreground hover:bg-muted",
                ].join(" ")}>
                <ChevronRight size={12} className={activeSection === s.id ? "text-[var(--nexis-accent)]" : "opacity-0"} />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-border px-3">
            <p className="text-sm text-foreground/55 mb-2">Base URL</p>
            <code className="text-xs font-mono text-[var(--nexis-accent)] break-all leading-relaxed">{API_BASE}</code>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 pt-20 pb-32 px-6 lg:px-10 space-y-20">
          {/* Overview */}
          <motion.section id="overview" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display font-bold text-4xl text-foreground mb-4">Nexis API Reference</h1>
            <p className="text-lg text-foreground/75 mb-8">
              All requests routed through Gensyn AXL. All responses include{" "}
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">routedViaAXL: boolean</code>.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Base URL", value: API_BASE, mono: true },
                { label: "Authentication", value: "None (5 free runs per IP)" },
                { label: "Privacy", value: "All requests via Gensyn AXL" },
              ].map((item) => (
                <div key={item.label} className="p-5 rounded-xl border border-border bg-card">
                  <p className="text-xs text-foreground/55 uppercase tracking-wider mb-2">{item.label}</p>
                  <p className={`text-sm font-medium text-foreground ${item.mono ? "font-mono text-[var(--nexis-accent)] text-xs break-all" : ""}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Quick Start */}
          <section id="quickstart">
            <h2 className="font-display font-bold text-2xl text-foreground mb-2">Quick Start</h2>
            <p className="text-base text-foreground/70 mb-6">Run your first private research query in 30 seconds.</p>
            <CodeBlock lang="bash" code={`curl -s -X POST ${API_BASE}/api/research/sync \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "goal": "Find pain points about Notion as a productivity tool",\n    "userId": "my-user-123"\n  }'`} />
            <div className="mt-6 p-5 rounded-xl border border-border bg-card">
              <p className="text-sm font-medium text-foreground mb-3">Response includes:</p>
              <ul className="space-y-2">
                {[
                  { field: "summary", desc: "Full markdown intelligence report" },
                  { field: "results[]", desc: "Structured data from each capability run" },
                  { field: "storage.rootHash", desc: "0G storage proof (verifiable on-chain)" },
                  { field: "routedViaAXL", desc: "Privacy confirmation" },
                ].map((item) => (
                  <li key={item.field} className="flex items-start gap-3 text-sm">
                    <code className="text-xs font-mono text-[var(--nexis-accent)] bg-[var(--nexis-accent-dim)] px-1.5 py-0.5 rounded flex-none">{item.field}</code>
                    <span className="text-foreground/70">{item.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Research API */}
          <section id="research-api" className="space-y-10">
            <h2 className="font-display font-bold text-2xl text-foreground">Research API</h2>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="POST" />
                <code className="text-sm font-mono text-foreground">/api/research/sync</code>
                <span className="text-sm text-foreground/60">Synchronous research (~1–3 min)</span>
              </div>
              <TabCodeBlock tabs={RESEARCH_SYNC_TABS} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="POST" />
                <code className="text-sm font-mono text-foreground">/api/research</code>
                <span className="text-sm text-foreground/60">Background research (returns immediately)</span>
              </div>
              <CodeBlock lang="bash" code={`curl -s -X POST ${API_BASE}/api/research \\\n  -H "Content-Type: application/json" \\\n  -d '{"goal": "Research DeFi privacy tools", "userId": "user-123"}'\n# Returns sessionId immediately\n# Poll GET /api/research/session/:sessionId every 3s until complete`} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="GET" />
                <code className="text-sm font-mono text-foreground">/api/research/sessions/:userId</code>
              </div>
              <TabCodeBlock tabs={SESSIONS_TABS} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="GET" />
                <code className="text-sm font-mono text-foreground">/api/research/session/:sessionId</code>
              </div>
              <CodeBlock lang="bash" code={`curl -s "${API_BASE}/api/research/session/YOUR_SESSION_ID"`} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="POST" />
                <code className="text-sm font-mono text-foreground">/api/research/retrieve</code>
                <span className="text-sm text-foreground/60">Decrypt from 0G storage</span>
              </div>
              <CodeBlock lang="bash" code={`curl -s -X POST ${API_BASE}/api/research/retrieve \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "rootHash": "0x02dfb800...",\n    "sessionId": "YOUR_SESSION_ID"\n  }'`} />
            </div>
          </section>

          {/* KeeperHub API */}
          <section id="keeperhub-api" className="space-y-10">
            <h2 className="font-display font-bold text-2xl text-foreground">KeeperHub API</h2>
            <p className="text-base text-foreground/70">
              Create autonomous monitoring workflows. KeeperHub watches onchain events and triggers Nexis research automatically.
            </p>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="POST" />
                <code className="text-sm font-mono text-foreground">/api/keeper/create-monitor</code>
              </div>
              <p className="text-sm text-foreground/65 mb-3">
                Four monitor types:{" "}
                {["whale", "scheduled", "defi", "generate"].map((t, i, arr) => (
                  <span key={t}>
                    <code className="bg-muted px-1 py-0.5 rounded text-foreground">{t}</code>
                    {i < arr.length - 1 && " · "}
                  </span>
                ))}
              </p>
              <TabCodeBlock tabs={KEEPER_WHALE_TABS} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="GET" />
                <code className="text-sm font-mono text-foreground">/api/keeper/workflows</code>
              </div>
              <CodeBlock lang="bash" code={`curl -s "${API_BASE}/api/keeper/workflows"`} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EndpointTag method="POST" />
                <code className="text-sm font-mono text-foreground">/api/keeper/webhook</code>
                <span className="text-sm text-foreground/60">Simulate a trigger event</span>
              </div>
              <CodeBlock lang="bash" code={`curl -s -X POST ${API_BASE}/api/keeper/webhook \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "type": "whale_movement",\n    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",\n    "threshold_eth": 5,\n    "userId": "keeper-auto"\n  }'`} />
            </div>
          </section>

          {/* Health API */}
          <section id="health-api">
            <h2 className="font-display font-bold text-2xl text-foreground mb-6">Health API</h2>
            <div className="flex items-center gap-3 mb-4">
              <EndpointTag method="GET" />
              <code className="text-sm font-mono text-foreground">/health</code>
              <span className="text-sm text-foreground/60">System status, AXL info, privacy proof</span>
            </div>
            <CodeBlock lang="bash" code={`curl -s "${API_BASE}/health"`} />
            <div className="mt-4 p-5 rounded-xl border border-border bg-[#0d0d0d] overflow-x-auto">
              <pre className="text-xs font-mono text-foreground/65 leading-relaxed">{`{
  "status": "ok",
  "version": "0.1.0",
  "services": {
    "axl": {
      "status": "running",
      "publicKey": "ca6b4b2c7d762faceb49947dbffc3233b95d1cf3ccbb0be2e93a3fd403c6fc22",
      "ipv6": "200:6b29:69a7:513:a0a6:296c:d704:8007"
    },
    "queue": { "size": 0, "pending": 0, "activeJobs": 0 }
  },
  "privacy": {
    "routedViaAXL": true,
    "encryptedStorage": "0G testnet",
    "identityLayer": "pseudonymous wallet"
  }
}`}</pre>
            </div>
          </section>

          {/* Goal Examples */}
          <section id="goal-examples">
            <h2 className="font-display font-bold text-2xl text-foreground mb-6">Goal Examples</h2>
            <p className="text-base text-foreground/70 mb-8">
              The{" "}
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">goal</code> field
              accepts natural language. Here are examples by category.
            </p>
            <div className="space-y-6">
              {GOAL_EXAMPLES.map((section) => (
                <div key={section.category}>
                  <h3 className="text-sm font-semibold text-foreground mb-3">{section.category}</h3>
                  <div className="rounded-xl border border-border bg-[#0d0d0d] p-5 space-y-2">
                    {section.examples.map((ex, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm font-mono">
                        <span className="text-foreground/40 flex-none">#</span>
                        <span className="text-[var(--nexis-accent)]">"{ex}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
