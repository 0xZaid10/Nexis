import { logger } from './logger.js';

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
// Ported from agent-src/utils/circuit-breaker.js
// Protects against cascading failures on external services

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  threshold?: number;
  timeout?: number;
  halfOpenMax?: number;
}

export class CircuitBreaker {
  private name: string;
  private state: State = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private threshold: number;
  private timeout: number;
  private halfOpenMax: number;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.threshold = options.threshold ?? 5;
    this.timeout = options.timeout ?? 60_000;
    this.halfOpenMax = options.halfOpenMax ?? 2;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureTime ?? 0);
      if (elapsed < this.timeout) {
        throw new Error(
          `Circuit breaker OPEN for ${this.name}. Retry in ${Math.ceil((this.timeout - elapsed) / 1000)}s`
        );
      }
      this.state = 'HALF_OPEN';
      logger.info(`[CircuitBreaker] HALF_OPEN: ${this.name}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err as Error);
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMax) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.info(`[CircuitBreaker] CLOSED: ${this.name}`);
      }
    }
  }

  private onFailure(err: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    logger.warn(`[CircuitBreaker] Failure: ${this.name}`, {
      count: this.failureCount,
      error: err.message,
    });
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.error(`[CircuitBreaker] OPEN: ${this.name} after ${this.failureCount} failures`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const breakers = {
  llm: new CircuitBreaker('tokenrouter-llm', { threshold: 5, timeout: 60_000 }),
  scraper: new CircuitBreaker('scraper', { threshold: 10, timeout: 30_000 }),
  reddit: new CircuitBreaker('reddit', { threshold: 8, timeout: 45_000 }),
};
