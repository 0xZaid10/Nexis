// ─── Research Session ─────────────────────────────────────────────────────────

export type SessionStatus = 'running' | 'completed' | 'failed';

export interface ResearchSession {
  id: string;
  userId: string;
  goal: string;
  status: SessionStatus;
  createdAt: string;
  completedAt?: string;
  results?: unknown;
  summary?: string;
  // 0G Storage
  rootHash?: string;       // Merkle root hash on 0G — key to retrieve
  encryptionKey?: string;  // AES-256 key (hex) — stored locally only, never on 0G
  txHash?: string;         // 0G transaction hash
}

// ─── Memory Entry ─────────────────────────────────────────────────────────────

export interface MemoryEntry {
  key: string;
  value: unknown;
  storedAt: string;
  source: 'local' | 'decentralized';
  rootHash?: string;
  encryptionKey?: string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  ensName?: string;
  company?: string;
  industry?: string;
  competitors?: string[];
  researchGoals?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Storage Result ───────────────────────────────────────────────────────────

export interface StorageResult {
  rootHash: string;
  txHash: string;
  encryptionKey: string; // hex string
  storedAt: string;
}

// ─── Retrieval Result ─────────────────────────────────────────────────────────

export interface RetrievalResult {
  data: unknown;
  rootHash: string;
  source: 'local' | 'decentralized';
}
