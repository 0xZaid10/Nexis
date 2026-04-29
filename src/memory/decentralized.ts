import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger.js';
import type { StorageResult, RetrievalResult } from './types.js';

// ─── 0G Decentralized Storage ─────────────────────────────────────────────────
//
// Encrypted, permanent, decentralized storage for Nexis research sessions.
//
// Every completed research session is:
//   1. Serialized to JSON
//   2. Encrypted with AES-256 (key stored locally in SQLite, never on 0G)
//   3. Uploaded to 0G Storage as a MemData blob
//   4. Root hash returned and saved to SQLite for retrieval
//
// Privacy guarantee: 0G nodes store only encrypted ciphertext.
// Only the user who has the encryption key (stored locally) can decrypt.

export class DecentralizedMemory {
  private indexer: Indexer;
  private signer: ethers.Wallet;
  private rpcUrl: string;

  constructor(rpcUrl: string, indexerRpc: string, privateKey: string) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, provider);
    this.indexer = new Indexer(indexerRpc);
    this.rpcUrl = rpcUrl;

    logger.info('[Memory:0G] Decentralized storage initialized', {
      indexer: indexerRpc,
      wallet: this.signer.address,
    });
  }

  // ─── Store (encrypt + upload to 0G) ───────────────────────────────────────

  async store(data: unknown): Promise<StorageResult> {
    logger.info('[Memory:0G] Storing session on 0G...');

    // Serialize
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);

    // Generate AES-256 encryption key
    const encryptionKey = randomBytes(32);

    // Create MemData blob
    const memData = new MemData(bytes);

    // Build merkle tree (required before upload)
    const [tree, treeErr] = await memData.merkleTree();
    if (treeErr) throw new Error(`[Memory:0G] Merkle tree error: ${treeErr}`);

    const merkleRoot = tree?.rootHash();
    logger.debug('[Memory:0G] Merkle root computed', { root: merkleRoot });

    // Upload with AES-256 encryption
    const [tx, uploadErr] = await this.indexer.upload(
      memData,
      this.rpcUrl,
      this.signer,
      { encryption: { type: 'aes256', key: encryptionKey } }
    );

    if (uploadErr) throw new Error(`[Memory:0G] Upload error: ${uploadErr}`);

    // Extract rootHash and txHash
    let rootHash: string;
    let txHash: string;

    if ('rootHash' in tx) {
      rootHash = tx.rootHash as string;
      txHash = tx.txHash as string;
    } else {
      // Fragmented upload (>4GB) — take first fragment
      rootHash = (tx as { rootHashes: string[] }).rootHashes[0];
      txHash = (tx as { txHashes: string[] }).txHashes[0];
    }

    const result: StorageResult = {
      rootHash,
      txHash,
      encryptionKey: encryptionKey.toString('hex'),
      storedAt: new Date().toISOString(),
    };

    logger.info('[Memory:0G] Session stored successfully', {
      rootHash,
      txHash,
      size: bytes.length,
    });

    return result;
  }

  // ─── Retrieve (download + decrypt from 0G) ────────────────────────────────

  async retrieve(rootHash: string, encryptionKeyHex: string): Promise<RetrievalResult> {
    logger.info('[Memory:0G] Retrieving session from 0G...', { rootHash });

    const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');

    // Download and decrypt
    const [blob, dlErr] = await (this.indexer as any).downloadToBlob(rootHash, {
      proof: true,
      decryption: { symmetricKey: encryptionKey },
    });

    if (dlErr) throw new Error(`[Memory:0G] Download error: ${dlErr}`);

    // Deserialize
    const buffer = await (blob as Blob).arrayBuffer();
    const text = new TextDecoder().decode(buffer);

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('[Memory:0G] Failed to parse retrieved data — possible decryption mismatch');
    }

    logger.info('[Memory:0G] Session retrieved successfully', { rootHash });

    return {
      data,
      rootHash,
      source: 'decentralized',
    };
  }

  // ─── Check if file exists on 0G ───────────────────────────────────────────

  async exists(rootHash: string): Promise<boolean> {
    try {
      const [header] = await (this.indexer as any).peekHeader(rootHash);
      return header !== null;
    } catch {
      return false;
    }
  }

  // ─── Get wallet info ──────────────────────────────────────────────────────

  getWalletAddress(): string {
    return this.signer.address;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _decentralized: DecentralizedMemory | null = null;

export function getDecentralizedMemory(): DecentralizedMemory {
  if (!_decentralized) throw new Error('[Memory:0G] Not initialized — call initDecentralizedMemory() first');
  return _decentralized;
}

export function initDecentralizedMemory(
  rpcUrl: string,
  indexerRpc: string,
  privateKey: string
): DecentralizedMemory {
  _decentralized = new DecentralizedMemory(rpcUrl, indexerRpc, privateKey);
  return _decentralized;
}
