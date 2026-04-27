export interface ResearchGoal {
  id: string;
  userId: string;
  goal: string;
  createdAt: string;
}

export interface ExecutionPlan {
  taskSummary: string;
  capabilities: CapabilityTask[];
  estimatedTimeSeconds: number;
  outputType: 'research' | 'content' | 'mixed';
}

export interface CapabilityTask {
  id: string;
  order: number;
  topic?: string;
  dependsOn?: string;
  params: Record<string, unknown>;
  reason: string;
}

export interface CapabilityResult {
  capability: string;
  success: boolean;
  error?: string;
  data: unknown;
}

export interface TaskResult {
  userId: string;
  goal: string;
  runAt: string;
  plan: ExecutionPlan;
  summary: string;
  results: CapabilityResult[];
}

export interface UserProfile {
  id: string;
  ensName?: string;
  company?: string;
  industry?: string;
  competitors?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PrivateRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  requiresPayment?: boolean;
}

export interface PrivateResponse {
  status: number;
  data: unknown;
  routedViaAXL: boolean;
  paidViaX402: boolean;
}

export interface MemoryEntry {
  key: string;
  value: unknown;
  storedAt: string;
  source: 'local' | 'decentralized';
  rootHash?: string;
}

export interface NexisConfig {
  anthropicApiKey: string;
  zgPrivateKey: string;
  zgEvmRpc: string;
  zgIndexerRpc: string;
  axlHost: string;
  axlPort: number;
  axlBinaryPath: string;
  x402WalletPrivateKey: string;
  x402RpcUrl: string;
  ensRpcUrl: string;
  keeperHubApiKey: string;
  keeperHubWebhookSecret: string;
  port: number;
  nodeEnv: string;
  logLevel: string;
  sqlitePath: string;
}
