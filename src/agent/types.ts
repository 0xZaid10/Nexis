// ─── Capability Result ────────────────────────────────────────────────────────

export interface CapabilityResult {
  capability: string;
  success: boolean;
  error?: string;
  data: unknown;
}

// ─── Execution Plan ───────────────────────────────────────────────────────────

export interface CapabilityTask {
  id: string;
  order: number;
  name: string;
  params: Record<string, unknown>;
  depends_on?: string;
  reason: string;
}

export interface ExecutionPlan {
  task_summary: string;
  capabilities: CapabilityTask[];
  estimated_time_seconds: number;
  output_type: 'research' | 'content' | 'mixed';
}

// ─── Context Manager ──────────────────────────────────────────────────────────

export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ResearchContext {
  goal: string;
  history: ContextMessage[];
  completedCapabilities: string[];
  accumulatedResults: Record<string, unknown>;
}
