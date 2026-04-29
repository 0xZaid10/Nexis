import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';
import type { ResearchSession, UserProfile, MemoryEntry } from './types.js';

// ─── Local SQLite Memory ──────────────────────────────────────────────────────
//
// Fast local cache for:
//   - Active research sessions
//   - Index of 0G root hashes (so we can retrieve sessions)
//   - User profiles
//   - General key-value memory
//
// SQLite is the source of truth for the current session.
// 0G Storage is the permanent decentralized backup.

export class LocalMemory {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
    logger.info('[Memory:Local] SQLite initialized', { path: dbPath });
  }

  // ─── Schema ────────────────────────────────────────────────────────────────

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        created_at TEXT NOT NULL,
        completed_at TEXT,
        results TEXT,
        summary TEXT,
        root_hash TEXT,
        encryption_key TEXT,
        tx_hash TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        ens_name TEXT,
        company TEXT,
        industry TEXT,
        competitors TEXT,
        research_goals TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memory (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        stored_at TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'local',
        root_hash TEXT,
        encryption_key TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_root_hash ON sessions(root_hash);
    `);
  }

  // ─── Sessions ──────────────────────────────────────────────────────────────

  createSession(session: ResearchSession): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, goal, status, created_at, results, summary)
      VALUES (@id, @userId, @goal, @status, @createdAt, @results, @summary)
    `);

    stmt.run({
      id: session.id,
      userId: session.userId,
      goal: session.goal,
      status: session.status,
      createdAt: session.createdAt,
      results: session.results ? JSON.stringify(session.results) : null,
      summary: session.summary ?? null,
    });

    logger.debug('[Memory:Local] Session created', { id: session.id });
  }

  updateSession(id: string, updates: Partial<ResearchSession>): void {
    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    if (updates.status !== undefined) { fields.push('status = @status'); values.status = updates.status; }
    if (updates.completedAt !== undefined) { fields.push('completed_at = @completedAt'); values.completedAt = updates.completedAt; }
    if (updates.results !== undefined) { fields.push('results = @results'); values.results = JSON.stringify(updates.results); }
    if (updates.summary !== undefined) { fields.push('summary = @summary'); values.summary = updates.summary; }
    if (updates.rootHash !== undefined) { fields.push('root_hash = @rootHash'); values.rootHash = updates.rootHash; }
    if (updates.encryptionKey !== undefined) { fields.push('encryption_key = @encryptionKey'); values.encryptionKey = updates.encryptionKey; }
    if (updates.txHash !== undefined) { fields.push('tx_hash = @txHash'); values.txHash = updates.txHash; }

    if (fields.length === 0) return;

    this.db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = @id`).run(values);
    logger.debug('[Memory:Local] Session updated', { id, fields });
  }

  getSession(id: string): ResearchSession | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToSession(row) : null;
  }

  getSessionsByUser(userId: string, limit = 20): ResearchSession[] {
    const rows = this.db.prepare(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit) as Record<string, unknown>[];
    return rows.map(this.rowToSession);
  }

  getCompletedSessions(userId: string, limit = 10): ResearchSession[] {
    const rows = this.db.prepare(
      `SELECT * FROM sessions WHERE user_id = ? AND status = 'completed'
       ORDER BY created_at DESC LIMIT ?`
    ).all(userId, limit) as Record<string, unknown>[];
    return rows.map(this.rowToSession);
  }

  private rowToSession(row: Record<string, unknown>): ResearchSession {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      goal: row.goal as string,
      status: row.status as ResearchSession['status'],
      createdAt: row.created_at as string,
      completedAt: row.completed_at as string | undefined,
      results: row.results ? JSON.parse(row.results as string) : undefined,
      summary: row.summary as string | undefined,
      rootHash: row.root_hash as string | undefined,
      encryptionKey: row.encryption_key as string | undefined,
      txHash: row.tx_hash as string | undefined,
    };
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  upsertUser(profile: UserProfile): void {
    this.db.prepare(`
      INSERT INTO users (id, ens_name, company, industry, competitors, research_goals, created_at, updated_at)
      VALUES (@id, @ensName, @company, @industry, @competitors, @researchGoals, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        ens_name = @ensName,
        company = @company,
        industry = @industry,
        competitors = @competitors,
        research_goals = @researchGoals,
        updated_at = @updatedAt
    `).run({
      id: profile.id,
      ensName: profile.ensName ?? null,
      company: profile.company ?? null,
      industry: profile.industry ?? null,
      competitors: profile.competitors ? JSON.stringify(profile.competitors) : null,
      researchGoals: profile.researchGoals ? JSON.stringify(profile.researchGoals) : null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }

  getUser(id: string): UserProfile | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      id: row.id as string,
      ensName: row.ens_name as string | undefined,
      company: row.company as string | undefined,
      industry: row.industry as string | undefined,
      competitors: row.competitors ? JSON.parse(row.competitors as string) : undefined,
      researchGoals: row.research_goals ? JSON.parse(row.research_goals as string) : undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  // ─── General KV Memory ─────────────────────────────────────────────────────

  set(key: string, value: unknown, source: 'local' | 'decentralized' = 'local', rootHash?: string): void {
    this.db.prepare(`
      INSERT INTO memory (key, value, stored_at, source, root_hash)
      VALUES (@key, @value, @storedAt, @source, @rootHash)
      ON CONFLICT(key) DO UPDATE SET
        value = @value, stored_at = @storedAt, source = @source, root_hash = @rootHash
    `).run({
      key,
      value: JSON.stringify(value),
      storedAt: new Date().toISOString(),
      source,
      rootHash: rootHash ?? null,
    });
  }

  get(key: string): MemoryEntry | null {
    const row = this.db.prepare('SELECT * FROM memory WHERE key = ?').get(key) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      key: row.key as string,
      value: JSON.parse(row.value as string),
      storedAt: row.stored_at as string,
      source: row.source as 'local' | 'decentralized',
      rootHash: row.root_hash as string | undefined,
    };
  }

  delete(key: string): void {
    this.db.prepare('DELETE FROM memory WHERE key = ?').run(key);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  getStats(): { sessions: number; users: number; memoryEntries: number } {
    const sessions = (this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
    const users = (this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const memoryEntries = (this.db.prepare('SELECT COUNT(*) as count FROM memory').get() as { count: number }).count;
    return { sessions, users, memoryEntries };
  }

  close(): void {
    this.db.close();
    logger.info('[Memory:Local] SQLite closed');
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _local: LocalMemory | null = null;

export function getLocalMemory(): LocalMemory {
  if (!_local) throw new Error('[Memory:Local] Not initialized — call initLocalMemory() first');
  return _local;
}

export function initLocalMemory(dbPath: string): LocalMemory {
  _local = new LocalMemory(dbPath);
  return _local;
}
