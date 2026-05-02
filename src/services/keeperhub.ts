import { logger } from '../utils/logger.js';

// ─── KeeperHub Service ────────────────────────────────────────────────────────
// Full API client for KeeperHub — the execution and reliability layer
// for AI agents operating onchain.
//
// Nexis uses KeeperHub bidirectionally:
//   A. KeeperHub triggers Nexis (onchain events → webhook → research)
//   B. Nexis creates/manages KeeperHub workflows based on research findings
//   C. Nexis executes onchain actions via KeeperHub Direct Execution API

const BASE_URL = process.env.KEEPERHUB_BASE_URL ?? 'https://app.keeperhub.com';
const API_KEY = process.env.KEEPERHUB_API_KEY ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeeperWorkflow {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface KeeperExecution {
  executionId: string;
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs?: unknown[];
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  position?: { x: number; y: number };
  data: {
    label: string;
    type: string;
    config: Record<string, unknown>;
    status: 'idle';
    description?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: 'true' | 'false' | 'loop' | 'done';
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`KeeperHub API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ─── Workflow Management ──────────────────────────────────────────────────────

export async function listWorkflows(): Promise<KeeperWorkflow[]> {
  logger.info('[KeeperHub] Listing workflows');
  const res = await apiCall<{ workflows: KeeperWorkflow[] }>('GET', '/api/workflows');
  return res.workflows ?? [];
}

export async function getWorkflow(workflowId: string): Promise<KeeperWorkflow> {
  return apiCall<KeeperWorkflow>('GET', `/api/workflows/${workflowId}`);
}

export async function createWorkflow(
  name: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<KeeperWorkflow> {
  logger.info('[KeeperHub] Creating workflow', { name });

  // Add position to nodes as required by the API
  const nodesWithPosition = nodes.map((node, i) => ({
    ...node,
    position: { x: i * 280, y: 0 },
  }));

  // Create workflow with nodes and edges in one call
  return apiCall<KeeperWorkflow>('POST', '/api/workflows/create', {
    name,
    nodes: nodesWithPosition,
    edges,
  });
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  await apiCall('DELETE', `/api/workflows/${workflowId}?force=true`);
  logger.info('[KeeperHub] Workflow deleted', { workflowId });
}

// ─── AI Generate Workflow (from natural language) ─────────────────────────────

export async function generateWorkflow(prompt: string): Promise<KeeperWorkflow> {
  logger.info('[KeeperHub] Generating workflow from prompt', { prompt: prompt.slice(0, 80) });
  // Create empty workflow first, then generate content via ai-generate
  const created = await apiCall<KeeperWorkflow>('POST', '/api/workflows/create', {
    name: 'Nexis Auto-Generated Workflow'
  });
  return apiCall<KeeperWorkflow>('POST', `/api/workflows/${created.id}/ai-generate`, { prompt });
}

// ─── Execution ────────────────────────────────────────────────────────────────

export async function executeWorkflow(workflowId: string): Promise<KeeperExecution> {
  logger.info('[KeeperHub] Executing workflow', { workflowId });
  return apiCall<KeeperExecution>('POST', `/api/workflow/${workflowId}/execute`);
}

export async function getExecutionStatus(executionId: string): Promise<KeeperExecution> {
  return apiCall<KeeperExecution>('GET', `/api/workflows/executions/${executionId}/status`);
}

export async function getExecutionLogs(executionId: string): Promise<unknown[]> {
  const res = await apiCall<{ data: unknown[] }>('GET', `/api/workflows/executions/${executionId}/logs`);
  return res.data ?? [];
}

export async function pollExecution(
  executionId: string,
  timeoutMs = 60_000
): Promise<KeeperExecution> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await getExecutionStatus(executionId);
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error(`Workflow execution timed out after ${timeoutMs}ms`);
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function searchTemplates(query: string): Promise<unknown[]> {
  const res = await apiCall<{ templates: unknown[] }>('GET', `/api/templates?q=${encodeURIComponent(query)}`);
  return res.templates ?? [];
}

// ─── Direct Execution API ─────────────────────────────────────────────────────

export async function checkBalance(
  address: string,
  network: string = 'ethereum'
): Promise<{ balance: string; symbol: string }> {
  return apiCall('POST', '/api/execute/check-balance', { address, network });
}

export async function transferFunds(
  recipientAddress: string,
  amount: string,
  network: string = 'base',
  tokenAddress?: string
): Promise<{ txHash: string; status: string }> {
  logger.info('[KeeperHub] Transferring funds', { recipient: recipientAddress, amount, network });
  return apiCall('POST', '/api/execute/transfer', {
    network,
    recipientAddress,
    amount,
    ...(tokenAddress && { tokenAddress }),
  });
}

export async function callContract(
  contractAddress: string,
  functionName: string,
  functionArgs: unknown[],
  network: string = 'ethereum',
  abi?: unknown[]
): Promise<unknown> {
  return apiCall('POST', '/api/execute/contract-call', {
    contractAddress,
    network,
    functionName,
    functionArgs: JSON.stringify(functionArgs),
    ...(abi && { abi: JSON.stringify(abi) }),
  });
}

// ─── Pre-built workflow creators for Nexis ────────────────────────────────────

export async function createWhaleMonitorWorkflow(
  nexisWebhookUrl: string,
  watchAddress: string,
  thresholdETH: number = 100
): Promise<KeeperWorkflow> {
  const name = `Nexis Whale Monitor — ${watchAddress.slice(0, 8)}... (>${thresholdETH} ETH)`;

  // KeeperHub pattern for balance monitoring:
  // Schedule → Get Native Token Balance → Condition (balance > threshold) → Webhook to Nexis
  const nodes: WorkflowNode[] = [
    {
      id: 'trigger-1',
      type: 'trigger',
      data: {
        label: 'Check Every 15 Minutes',
        type: 'trigger',
        config: { triggerType: 'Schedule', interval: '15m' },
        status: 'idle',
        description: `Periodically checks wallet ${watchAddress.slice(0, 8)}...`,
      },
    },
    {
      id: 'balance-1',
      type: 'action',
      data: {
        label: 'Get Wallet Balance',
        type: 'action',
        config: {
          actionType: 'web3/check-balance',
          network: '1', // Ethereum mainnet
          address: watchAddress,
        },
        status: 'idle',
        description: `Check ETH balance of ${watchAddress.slice(0, 8)}...`,
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      data: {
        label: `Balance > ${thresholdETH} ETH`,
        type: 'condition',
        config: {
          conditions: [{
            field: `{{@balance-1:Get Wallet Balance.balance}}`,
            operator: '>',
            value: thresholdETH.toString(),
          }],
        },
        status: 'idle',
        description: `Alert if balance exceeds ${thresholdETH} ETH`,
      },
    },
    {
      id: 'webhook-1',
      type: 'action',
      data: {
        label: 'Trigger Nexis Research',
        type: 'action',
        config: {
          actionType: 'webhook',
          url: nexisWebhookUrl,
          payload: JSON.stringify({
            type: 'whale_movement',
            address: watchAddress,
            threshold_eth: thresholdETH,
            balance: `{{@balance-1:Get Wallet Balance.balance}}`,
            userId: 'keeper-auto',
          }),
        },
        status: 'idle',
        description: 'Calls Nexis to run private wallet intelligence research',
      },
    },
  ];

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', source: 'trigger-1', target: 'balance-1' },
    { id: 'edge-2', source: 'balance-1', target: 'condition-1' },
    { id: 'edge-3', source: 'condition-1', target: 'webhook-1', sourceHandle: 'true' },
  ];

  return createWorkflow(name, nodes, edges);
}

export async function createScheduledResearchWorkflow(
  nexisWebhookUrl: string,
  researchGoal: string,
  cronExpression: string = '0 9 * * 1'
): Promise<KeeperWorkflow> {
  const name = `Nexis Scheduled Research — ${researchGoal.slice(0, 40)}`;

  const nodes: WorkflowNode[] = [
    {
      id: 'trigger-1',
      type: 'trigger',
      data: {
        label: 'Scheduled Trigger',
        type: 'trigger',
        config: { triggerType: 'Schedule', cron: cronExpression },
        status: 'idle',
        description: `Runs research on schedule: ${cronExpression}`,
      },
    },
    {
      id: 'webhook-1',
      type: 'action',
      data: {
        label: 'Run Nexis Research',
        type: 'action',
        config: {
          actionType: 'webhook',
          url: nexisWebhookUrl,
          payload: JSON.stringify({
            type: 'scheduled_research',
            goal: researchGoal,
            userId: 'keeper-scheduled',
          }),
        },
        status: 'idle',
        description: 'Triggers Nexis autonomous research run',
      },
    },
  ];

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', source: 'trigger-1', target: 'webhook-1' },
  ];

  return createWorkflow(name, nodes, edges);
}

export async function createTokenSurgeWorkflow(
  nexisWebhookUrl: string,
  tokenAddress: string,
  priceChangePercent: number = 20
): Promise<KeeperWorkflow> {
  const name = `Nexis Token Surge — ${tokenAddress.slice(0, 8)}... (>${priceChangePercent}%)`;

  const nodes: WorkflowNode[] = [
    {
      id: 'trigger-1',
      type: 'trigger',
      data: {
        label: 'Price Change Trigger',
        type: 'trigger',
        config: {
          triggerType: 'blockchain/price-change',
          tokenAddress,
          network: '1',
          changePercent: priceChangePercent.toString(),
          timeWindow: '3600',
        },
        status: 'idle',
      },
    },
    {
      id: 'webhook-1',
      type: 'action',
      data: {
        label: 'Trigger Nexis Token Research',
        type: 'action',
        config: {
          actionType: 'webhook',
          url: nexisWebhookUrl,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'token_surge',
            tokenAddress,
            threshold_percent: priceChangePercent,
            userId: 'keeper-auto',
          }),
        },
        status: 'idle',
      },
    },
  ];

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', source: 'trigger-1', target: 'webhook-1' },
  ];

  return createWorkflow(name, nodes, edges);
}

// ─── List integrations ────────────────────────────────────────────────────────

export async function listIntegrations(): Promise<unknown[]> {
  const res = await apiCall<{ integrations: unknown[] }>('GET', '/api/integrations');
  return res.integrations ?? [];
}

export async function getWalletIntegration(): Promise<unknown> {
  return apiCall('GET', '/api/integrations/wallet');
}
