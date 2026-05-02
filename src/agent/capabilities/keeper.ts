import { getLLM } from '../../services/llm.js';
import {
  createWorkflow,
  createWhaleMonitorWorkflow,
  createScheduledResearchWorkflow,
  createTokenSurgeWorkflow,
  executeWorkflow,
  listWorkflows,
  pollExecution,
  type WorkflowNode,
  type WorkflowEdge,
} from '../../services/keeperhub.js';
import { getLocalMemory } from '../../memory/local.js';
import { logger } from '../../utils/logger.js';
import type { CapabilityResult } from '../types.js';

// ─── KeeperHub Capability — Maximum Leverage ──────────────────────────────────
//
// Nexis creates sophisticated KeeperHub workflows autonomously using LLM.
// Supports: whale monitoring, token alerts, scheduled research, DeFi automation
// All workflows include Telegram notification + Nexis webhook for research
//
// KeeperHub features used:
//   - Schedule, Webhook, Manual triggers
//   - web3/check-balance, web3/read-contract actions
//   - Condition nodes with true/false branching
//   - Telegram notification nodes
//   - Webhook action to call Nexis
//   - ai_generate_workflow for complex natural language workflows

export interface KeeperParams {
  action: 'create_whale_monitor' | 'create_token_monitor' | 'create_scheduled'
        | 'create_defi_monitor' | 'generate' | 'list' | 'execute';
  target?: string;
  goal?: string;
  threshold?: number;
  schedule?: string;
  workflowId?: string;
  researchGoal?: string;
  telegramChatId?: string;
  contractAddress?: string;
  network?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const NEXIS_WEBHOOK_URL = process.env.NEXIS_PUBLIC_URL
  ? `${process.env.NEXIS_PUBLIC_URL}/api/keeper/webhook`
  : 'http://localhost:3000/api/keeper/webhook';

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TELEGRAM_CONNECTION_ID = process.env.KEEPERHUB_TELEGRAM_CONNECTION_ID || '';

// ─── Build Telegram notification node ────────────────────────────────────────

function buildTelegramNode(
  id: string,
  message: string,
  chatId: string = TELEGRAM_CHAT_ID
): WorkflowNode {
  return {
    id,
    type: 'action',
    data: {
      label: 'Send Telegram Alert',
      type: 'action',
      config: {
        actionType: 'telegram/send-message',
        connectionId: TELEGRAM_CONNECTION_ID,
        chatId,
        message,
        parseMode: 'plain',
      },
      status: 'idle',
      description: 'Sends alert via Telegram',
    },
  };
}

// ─── Build Nexis webhook node ─────────────────────────────────────────────────

function buildNexisWebhookNode(
  id: string,
  payload: Record<string, unknown>,
  label = 'Trigger Nexis Research'
): WorkflowNode {
  return {
    id,
    type: 'action',
    data: {
      label,
      type: 'action',
      config: {
        actionType: 'webhook',
        url: NEXIS_WEBHOOK_URL,
        payload: JSON.stringify(payload),
      },
      status: 'idle',
      description: 'Calls Nexis private research agent',
    },
  };
}

// ─── LLM-powered complex workflow generator ───────────────────────────────────
// Uses one LLM call to design a full multi-node KeeperHub workflow
// from a natural language goal, then creates it via API

async function generateComplexWorkflow(goal: string): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[]; name: string }> {
  const llm = getLLM();

  const systemPrompt = `You are a KeeperHub workflow architect. Design workflows using these exact node structures.

TRIGGER TYPES:
- Schedule: { triggerType: "Schedule", interval: "15m" | "1h" | "1d", cron: "0 9 * * 1" }
- Manual: { triggerType: "Manual" }
- Webhook: { triggerType: "Webhook" }

ACTION TYPES (use exact actionType strings):
- web3/check-balance: { actionType: "web3/check-balance", network: "1", address: "0x..." }
- web3/read-contract: { actionType: "web3/read-contract", network: "1", contractAddress: "0x...", functionName: "..." }
- webhook: { actionType: "webhook", url: "${NEXIS_WEBHOOK_URL}", payload: "{...}" }
- telegram/send-message: { actionType: "telegram/send-message", chatId: "${TELEGRAM_CHAT_ID}", message: "..." }

CONDITION TYPE:
- type: "condition", config: { conditions: [{ field: "{{@nodeId:Label.field}}", operator: ">", value: "100" }] }

RULE: Always end workflows with both a Nexis webhook (for research) AND a Telegram notification.
RULE: Use conditions to branch — only trigger Nexis if threshold is met.
RULE: Template variables use format: {{@nodeId:Label.field}}

Return ONLY valid JSON:
{
  "name": "workflow name max 50 chars",
  "nodes": [array of node objects with id, type, data fields],
  "edges": [array of edge objects with id, source, target, optional sourceHandle]
}`;

  const raw = await llm.prompt(
    `Design a KeeperHub workflow for: "${goal}"

Use node IDs: trigger-1, action-1, action-2, condition-1, etc.
Include position field: {"x": 0, "y": 0} spaced 280px apart horizontally.
Always include Nexis webhook + Telegram notification nodes at the end.
The Nexis webhook payload must include: type, goal, userId: "keeper-auto".

Return valid JSON only.`,
    systemPrompt,
    { temperature: 0.2, maxTokens: 2000 }
  );

  try {
    const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
    const parsed = JSON.parse(raw.slice(f, l + 1));

    // Ensure positions are set
    if (parsed.nodes) {
      parsed.nodes = parsed.nodes.map((n: WorkflowNode, i: number) => ({
        ...n,
        position: (n as any).position || { x: i * 280, y: 0 },
      }));
    }

    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse LLM workflow design: ${(err as Error).message}`);
  }
}

// ─── Main capability ──────────────────────────────────────────────────────────

export async function runKeeperHub(params: KeeperParams): Promise<CapabilityResult> {
  const { action } = params;
  const mem = getLocalMemory();
  const llm = getLLM();

  logger.info('[Capability:KeeperHub] Starting', { action });

  try {
    switch (action) {

      // ── Whale monitor — full workflow with balance check + condition + Nexis + Telegram ──
      case 'create_whale_monitor': {
        if (!params.target) throw new Error('target wallet address required');
        const threshold = params.threshold ?? 100;

        const name = `Nexis Whale Monitor — ${params.target.slice(0, 8)}... (>${threshold} ETH)`;

        const nodes: WorkflowNode[] = [
          {
            id: 'trigger-1',
            type: 'trigger',
            data: {
              label: 'Check Every 15 Minutes',
              type: 'trigger',
              config: { triggerType: 'Schedule', interval: '15m' },
              status: 'idle',
              description: `Monitors wallet ${params.target.slice(0, 8)}...`,
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
                network: '1',
                address: params.target,
              },
              status: 'idle',
              description: `Check ETH balance of ${params.target.slice(0, 8)}...`,
            },
          },
          {
            id: 'condition-1',
            type: 'condition',
            data: {
              label: `Balance > ${threshold} ETH`,
              type: 'condition',
              config: {
                conditions: [{
                  field: '{{@balance-1:Get Wallet Balance.balance}}',
                  operator: '>',
                  value: threshold.toString(),
                }],
              },
              status: 'idle',
              description: `Triggers research if balance exceeds ${threshold} ETH`,
            },
          },
          buildNexisWebhookNode('nexis-1', {
            type: 'whale_movement',
            address: params.target,
            threshold_eth: threshold,
            balance: '{{@balance-1:Get Wallet Balance.balance}}',
            userId: 'keeper-auto',
          }),
          buildTelegramNode(
            'telegram-1',
            `🔔 Nexis Whale Alert\n\nWallet ${params.target.slice(0, 8)}... has balance > ${threshold} ETH\nCurrent: {{@balance-1:Get Wallet Balance.balance}} ETH\n\nNexis is running private intelligence research...`,
            params.telegramChatId
          ),
        ];

        const edges: WorkflowEdge[] = [
          { id: 'e1', source: 'trigger-1', target: 'balance-1' },
          { id: 'e2', source: 'balance-1', target: 'condition-1' },
          { id: 'e3', source: 'condition-1', target: 'nexis-1', sourceHandle: 'true' },
          { id: 'e4', source: 'nexis-1', target: 'telegram-1' },
        ];

        const workflow = await createWorkflow(name, nodes, edges);

        mem.set(`keeper_whale_${params.target.slice(0, 8)}`, {
          workflowId: workflow.id,
          target: params.target,
          threshold,
          created_at: new Date().toISOString(),
        });

        return {
          capability: 'keeperhub',
          success: true,
          data: {
            type: 'workflow_created',
            workflow_type: 'whale_monitor',
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            watching: params.target,
            threshold_eth: threshold,
            nodes_count: nodes.length,
            features: ['Schedule trigger', 'Balance check', 'Condition gate', 'Nexis webhook', 'Telegram alert'],
            message: `Full whale monitoring workflow created. KeeperHub checks every 15min, alerts via Telegram and triggers Nexis research when balance > ${threshold} ETH.`,
          },
        };
      }

      // ── Scheduled research — cron + Nexis + Telegram ──────────────────────
      case 'create_scheduled': {
        const goal = params.researchGoal ?? params.goal ?? 'Run competitive intelligence research';
        const schedule = params.schedule ?? '0 9 * * 1';

        const name = `Nexis Scheduled — ${goal.slice(0, 40)}`;

        const nodes: WorkflowNode[] = [
          {
            id: 'trigger-1',
            type: 'trigger',
            data: {
              label: 'Scheduled Trigger',
              type: 'trigger',
              config: { triggerType: 'Schedule', cron: schedule },
              status: 'idle',
              description: `Runs on schedule: ${schedule}`,
            },
          },
          buildNexisWebhookNode('nexis-1', {
            type: 'scheduled_research',
            goal,
            userId: 'keeper-scheduled',
          }, 'Run Nexis Research'),
          buildTelegramNode(
            'telegram-1',
            `📊 Nexis Scheduled Research Started\n\nGoal: ${goal.slice(0, 100)}\n\nResults will be encrypted and stored on 0G Storage.`,
            params.telegramChatId
          ),
        ];

        const edges: WorkflowEdge[] = [
          { id: 'e1', source: 'trigger-1', target: 'nexis-1' },
          { id: 'e2', source: 'nexis-1', target: 'telegram-1' },
        ];

        const workflow = await createWorkflow(name, nodes, edges);

        mem.set(`keeper_scheduled_${Date.now()}`, {
          workflowId: workflow.id,
          goal,
          schedule,
          created_at: new Date().toISOString(),
        });

        return {
          capability: 'keeperhub',
          success: true,
          data: {
            type: 'workflow_created',
            workflow_type: 'scheduled_research',
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            goal,
            schedule,
            features: ['Schedule trigger', 'Nexis webhook', 'Telegram notification'],
            message: `Scheduled research workflow created. Runs "${goal}" on cron: ${schedule}. Results stored encrypted on 0G.`,
          },
        };
      }

      // ── DeFi monitor — read contract + condition + Nexis + Telegram ────────
      case 'create_defi_monitor': {
        const contractAddress = params.contractAddress ?? params.target ?? '';
        const network = params.network ?? '1';
        const threshold = params.threshold ?? 1.5;
        const goal = params.goal ?? `Research DeFi protocol at ${contractAddress}`;

        if (!contractAddress) throw new Error('contractAddress required for DeFi monitoring');

        const name = `Nexis DeFi Monitor — ${contractAddress.slice(0, 8)}...`;

        const nodes: WorkflowNode[] = [
          {
            id: 'trigger-1',
            type: 'trigger',
            data: {
              label: 'Check Every Hour',
              type: 'trigger',
              config: { triggerType: 'Schedule', interval: '1h' },
              status: 'idle',
              description: 'Hourly protocol health check',
            },
          },
          {
            id: 'read-1',
            type: 'action',
            data: {
              label: 'Read Contract State',
              type: 'action',
              config: {
                actionType: 'web3/read-contract',
                network,
                contractAddress,
                functionName: 'totalSupply',
              },
              status: 'idle',
              description: `Read state from ${contractAddress.slice(0, 8)}...`,
            },
          },
          buildNexisWebhookNode('nexis-1', {
            type: 'defi_monitor',
            contractAddress,
            network,
            goal,
            contractValue: '{{@read-1:Read Contract State.result}}',
            userId: 'keeper-auto',
          }),
          buildTelegramNode(
            'telegram-1',
            `🔍 Nexis DeFi Monitor\n\nContract: ${contractAddress.slice(0, 8)}...\nValue: {{@read-1:Read Contract State.result}}\n\nNexis is analyzing this protocol privately...`,
            params.telegramChatId
          ),
        ];

        const edges: WorkflowEdge[] = [
          { id: 'e1', source: 'trigger-1', target: 'read-1' },
          { id: 'e2', source: 'read-1', target: 'nexis-1' },
          { id: 'e3', source: 'nexis-1', target: 'telegram-1' },
        ];

        const workflow = await createWorkflow(name, nodes, edges);

        return {
          capability: 'keeperhub',
          success: true,
          data: {
            type: 'workflow_created',
            workflow_type: 'defi_monitor',
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            contract: contractAddress,
            network,
            features: ['Schedule trigger', 'Contract read', 'Nexis webhook', 'Telegram alert'],
            message: `DeFi protocol monitor created. Reads contract state hourly, triggers Nexis research, sends Telegram alerts.`,
          },
        };
      }

      // ── Generate complex workflow from natural language (LLM-powered) ──────
      case 'generate': {
        if (!params.goal) throw new Error('goal required for workflow generation');

        logger.info('[KeeperHub] Generating complex workflow via LLM', { goal: params.goal.slice(0, 80) });

        // Use LLM to design the full workflow
        const design = await generateComplexWorkflow(params.goal);

        // Create via KeeperHub API
        const workflow = await createWorkflow(design.name, design.nodes, design.edges);

        mem.set(`keeper_generated_${Date.now()}`, {
          workflowId: workflow.id,
          goal: params.goal,
          nodes_count: design.nodes.length,
          created_at: new Date().toISOString(),
        });

        logger.info('[KeeperHub] Complex workflow created', {
          workflowId: workflow.id,
          nodes: design.nodes.length,
          edges: design.edges.length,
        });

        return {
          capability: 'keeperhub',
          success: true,
          data: {
            type: 'workflow_created',
            workflow_type: 'llm_generated',
            workflow_id: workflow.id,
            workflow_name: design.name,
            original_goal: params.goal,
            nodes_count: design.nodes.length,
            edges_count: design.edges.length,
            node_types: design.nodes.map((n: WorkflowNode) => n.data.label),
            message: `Complex ${design.nodes.length}-node workflow generated by Nexis AI and created on KeeperHub: "${design.name}"`,
          },
        };
      }

      // ── List workflows ────────────────────────────────────────────────────
      case 'list': {
        const workflows = await listWorkflows();
        const nexisWorkflows = workflows.filter(w =>
          w.name.toLowerCase().includes('nexis')
        );

        return {
          capability: 'keeperhub',
          success: true,
          data: {
            type: 'workflow_list',
            total_workflows: workflows.length,
            nexis_workflows: nexisWorkflows.length,
            workflows: workflows.map(w => ({
              id: w.id,
              name: w.name,
              status: (w as any).enabled ? 'active' : 'inactive',
              createdAt: w.createdAt,
            })),
          },
        };
      }

      // ── Execute workflow manually ─────────────────────────────────────────
      case 'execute': {
        if (!params.workflowId) throw new Error('workflowId required');

        const execution = await executeWorkflow(params.workflowId);
        const finalStatus = await pollExecution(execution.executionId, 30_000).catch(() => execution);

        return {
          capability: 'keeperhub',
          success: true,
          data: {
            type: 'workflow_executed',
            workflow_id: params.workflowId,
            execution_id: execution.executionId,
            status: finalStatus.status,
          },
        };
      }

      default:
        throw new Error(`Unknown KeeperHub action: ${action}`);
    }

  } catch (err) {
    logger.error('[Capability:KeeperHub] Failed', { action, error: (err as Error).message });
    return {
      capability: 'keeperhub',
      success: false,
      error: (err as Error).message,
      data: { action },
    };
  }
}
