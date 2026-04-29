import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';
import type { AXLStatus, AXLTopology, AXLConfig } from './types.js';

const AXL_READY_TIMEOUT_MS = 15_000;
const AXL_HEALTH_INTERVAL_MS = 5_000;
const AXL_RESTART_DELAY_MS = 3_000;
const MAX_RESTART_ATTEMPTS = 5;

export class AXLManager {
  private process: ChildProcess | null = null;
  private status: AXLStatus = 'stopped';
  private publicKey: string | null = null;
  private ipv6: string | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private restartAttempts = 0;
  private baseUrl: string;

  constructor(private config: AXLConfig) {
    this.baseUrl = `http://${config.host}:${config.port}`;
  }

  // ─── Start ──────────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.status === 'running') {
      logger.info('[AXL] Already running');
      return;
    }

    this.status = 'starting';
    logger.info('[AXL] Starting node...', {
      binary: this.config.binaryPath,
      config: this.config.configPath,
    });

    this.spawnProcess();
    await this.waitUntilReady();
    this.startHealthCheck();

    const topology = await this.getTopology();
    this.publicKey = topology.our_public_key;
    this.ipv6 = topology.our_ipv6;

    logger.info('[AXL] Node is ready', {
      publicKey: this.publicKey,
      ipv6: this.ipv6,
    });
  }

  // ─── Stop ───────────────────────────────────────────────────────────────────

  stop(): void {
    this.stopHealthCheck();
    if (this.process) {
      logger.info('[AXL] Stopping node...');
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.status = 'stopped';
    this.restartAttempts = 0;
  }

  // ─── Spawn ──────────────────────────────────────────────────────────────────

  private spawnProcess(): void {
    this.process = spawn(this.config.binaryPath, ['-config', this.config.configPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) logger.debug(`[AXL] ${line}`);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) logger.warn(`[AXL] ${line}`);
    });

    this.process.on('exit', (code, signal) => {
      logger.warn('[AXL] Process exited', { code, signal });
      this.status = 'crashed';
      this.scheduleRestart();
    });

    this.process.on('error', (err) => {
      logger.error('[AXL] Process error', { error: err.message });
      this.status = 'crashed';
      this.scheduleRestart();
    });
  }

  // ─── Restart ────────────────────────────────────────────────────────────────

  private scheduleRestart(): void {
    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      logger.error('[AXL] Max restart attempts reached — giving up');
      return;
    }

    this.restartAttempts++;
    logger.info(`[AXL] Restarting in ${AXL_RESTART_DELAY_MS}ms`, {
      attempt: this.restartAttempts,
      max: MAX_RESTART_ATTEMPTS,
    });

    setTimeout(async () => {
      try {
        this.status = 'starting';
        this.spawnProcess();
        await this.waitUntilReady();
        this.status = 'running';
        this.restartAttempts = 0;
        logger.info('[AXL] Restarted successfully');
      } catch (err) {
        logger.error('[AXL] Restart failed', { error: (err as Error).message });
        this.scheduleRestart();
      }
    }, AXL_RESTART_DELAY_MS);
  }

  // ─── Health check ───────────────────────────────────────────────────────────

  private startHealthCheck(): void {
    this.healthTimer = setInterval(async () => {
      try {
        await this.getTopology();
        if (this.status !== 'running') {
          this.status = 'running';
          logger.info('[AXL] Node recovered');
        }
      } catch {
        logger.warn('[AXL] Health check failed');
        this.status = 'crashed';
      }
    }, AXL_HEALTH_INTERVAL_MS);
  }

  private stopHealthCheck(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  // ─── Wait until ready ───────────────────────────────────────────────────────

  private async waitUntilReady(): Promise<void> {
    const deadline = Date.now() + AXL_READY_TIMEOUT_MS;
    const pollInterval = 500;

    while (Date.now() < deadline) {
      try {
        await this.getTopology();
        this.status = 'running';
        return;
      } catch {
        await new Promise((r) => setTimeout(r, pollInterval));
      }
    }

    throw new Error(`[AXL] Node did not become ready within ${AXL_READY_TIMEOUT_MS}ms`);
  }

  // ─── Topology ───────────────────────────────────────────────────────────────

  async getTopology(): Promise<AXLTopology> {
    const res = await fetch(`${this.baseUrl}/topology`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) throw new Error(`[AXL] Topology request failed: ${res.status}`);
    return res.json() as Promise<AXLTopology>;
  }

  // ─── Send ───────────────────────────────────────────────────────────────────

  async send(destinationPeerId: string, payload: unknown): Promise<void> {
    const res = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'X-Destination-Peer-Id': destinationPeerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`[AXL] Send failed: ${res.status}`);
  }

  // ─── Recv ───────────────────────────────────────────────────────────────────

  async recv(): Promise<{ data: unknown; fromPeerId: string } | null> {
    const res = await fetch(`${this.baseUrl}/recv`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (res.status === 204) return null; // no messages
    if (!res.ok) throw new Error(`[AXL] Recv failed: ${res.status}`);

    const fromPeerId = res.headers.get('X-From-Peer-Id') ?? 'unknown';
    const text = await res.text();

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { data, fromPeerId };
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  getStatus(): AXLStatus { return this.status; }
  getPublicKey(): string | null { return this.publicKey; }
  getIPv6(): string | null { return this.ipv6; }
  getBaseUrl(): string { return this.baseUrl; }
  isReady(): boolean { return this.status === 'running'; }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _axl: AXLManager | null = null;

export function getAXL(): AXLManager {
  if (!_axl) throw new Error('[AXL] Manager not initialized — call initAXL() first');
  return _axl;
}

export async function initAXL(config: AXLConfig): Promise<AXLManager> {
  _axl = new AXLManager(config);
  await _axl.start();
  return _axl;
}
