// ─── AXL Node Status ──────────────────────────────────────────────────────────

export type AXLStatus = 'stopped' | 'starting' | 'running' | 'crashed';

export interface AXLTopology {
  our_public_key: string;
  our_ipv6: string;
  peers: string[];
  tree: unknown;
}

export interface AXLConfig {
  host: string;
  port: number;
  binaryPath: string;
  configPath: string;
}

// ─── Private Request / Response ──────────────────────────────────────────────

export interface PrivateRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface PrivateResponse {
  status: number;
  data: unknown;
  routedViaAXL: boolean;
  fromPeerId?: string;
}

// ─── Router Options ───────────────────────────────────────────────────────────

export interface RouterOptions {
  // If destinationPeerId is set, route through AXL mesh to a specific peer
  // If not set, use AXL as a local privacy proxy (outbound requests only)
  destinationPeerId?: string;
  timeoutMs?: number;
  retries?: number;
}

// ─── Direct HTTP Request (bypasses AXL — for internal use only) ──────────────

export interface DirectRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}
