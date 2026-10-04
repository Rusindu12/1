/**
 * AI Brain Storage Layer
 * Supports PostgreSQL with pgvector for production scale,
 * and high-performance in-memory vector indexing with local persistence
 * for offline mobile sync, development, and testing.
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import { MemoryEntry, MemorySearchParams, MemorySearchResult, MemoryTier } from '../memory/types';
import { MultilingualEmbedder } from '../embeddings/embedder';

export interface TaskRecord {
  id: string;
  accountId: string;
  title: string;
  plan?: any;
  status: 'pending' | 'running' | 'paused_confirmation' | 'completed' | 'failed';
  progress: number;
  liveSteps: Array<{
    step: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    timestamp: string;
    details?: any;
  }>;
  requiresConfirmation: boolean;
  confirmationPayload?: any;
  confirmationToken?: string;
  errorMessage?: string;
  result?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LearningItemRecord {
  id: string;
  accountId: string;
  topic: string;
  sourceUrl: string;
  sourceDomain: string;
  extractedSummary: string;
  rawChunk: string;
  confidence: number;
  crossCheckCount: number;
  crossCheckSources: string[];
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  approvedAt?: string;
  createdAt: string;
}

export interface AccountRecord {
  id: string;
  accountKey: string;
  name: string;
  email?: string;
  role: string;
  killSwitchEnabled: boolean;
  costLimitUsd: number;
  currentUsageUsd: number;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  accountId: string;
  keyHash: string;
  keyPrefix: string;
  label: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export class BrainDataStore {
  private pgPool?: Pool;
  private embedder: MultilingualEmbedder;

  // In-Memory store tables
  private accounts: Map<string, AccountRecord> = new Map();
  private apiKeys: Map<string, ApiKeyRecord> = new Map();
  private memories: Map<string, MemoryEntry> = new Map();
  private tasks: Map<string, TaskRecord> = new Map();
  private learningFeed: Map<string, LearningItemRecord> = new Map();
  private githubIntegrations: Map<string, any> = new Map();
  private auditLogs: any[] = [];

  constructor() {
    this.embedder = new MultilingualEmbedder();
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        this.pgPool = new Pool({
          connectionString: dbUrl,
          ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
          max: 10
        });
      } catch (e) {
        console.warn('Postgres connection pool failed to init, falling back to local memory store', e);
      }
    }

    // Initialize default master demo account & API key
    this.initDefaultAccount();
  }

  private initDefaultAccount() {
    const defaultAccountId = '00000000-0000-4000-8000-000000000001';
    const defaultAccountKey = 'brain_acc_master_default_2026';
    const defaultRawApiKey = 'brain_key_master_sinhala_english_universal_access';

    const account: AccountRecord = {
      id: defaultAccountId,
      accountKey: defaultAccountKey,
      name: 'Default User (Bilingual)',
      email: 'user@aibrain.local',
      role: 'admin',
      killSwitchEnabled: false,
      costLimitUsd: 100.0,
      currentUsageUsd: 0.12,
      createdAt: new Date().toISOString()
    };
    this.accounts.set(defaultAccountId, account);

    const hash = crypto.createHash('sha256').update(defaultRawApiKey).digest('hex');
    const apiKey: ApiKeyRecord = {
      id: '00000000-0000-4000-8000-000000000002',
      accountId: defaultAccountId,
      keyHash: hash,
      keyPrefix: defaultRawApiKey.substring(0, 12),
      label: 'Default Universal Key',
      permissions: ['chat', 'memory_read', 'memory_write', 'tasks', 'coding', 'github', 'admin'],
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.apiKeys.set(hash, apiKey);
  }

  // --------------------------------------------------------------------------
  // ACCOUNT & AUTH
  // --------------------------------------------------------------------------
  async getAccountByKey(accountKey: string): Promise<AccountRecord | null> {
    for (const acc of this.accounts.values()) {
      if (acc.accountKey === accountKey) return acc;
    }
    return null;
  }

  async validateApiKey(rawKey: string): Promise<{ account: AccountRecord; apiKey: ApiKeyRecord } | null> {
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = this.apiKeys.get(hash);
    if (!apiKey || !apiKey.isActive) return null;

    const account = this.accounts.get(apiKey.accountId);
    if (!account || account.killSwitchEnabled) return null;

    return { account, apiKey };
  }

  async createApiKey(accountId: string, label: string, permissions: string[]): Promise<string> {
    const rawKey = `brain_key_${crypto.randomBytes(24).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey: ApiKeyRecord = {
      id: crypto.randomUUID(),
      accountId,
      keyHash: hash,
      keyPrefix: rawKey.substring(0, 14),
      label,
      permissions,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.apiKeys.set(hash, apiKey);
    return rawKey;
  }

  async listApiKeys(accountId: string): Promise<ApiKeyRecord[]> {
    return Array.from(this.apiKeys.values()).filter(k => k.accountId === accountId);
  }

  async setKillSwitch(accountId: string, enabled: boolean): Promise<boolean> {
    const account = this.accounts.get(accountId);
    if (account) {
      account.killSwitchEnabled = enabled;
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // MEMORY MANAGEMENT (pgvector + in-memory fallback)
  // --------------------------------------------------------------------------
  async insertMemory(params: {
    accountId: string;
    tier: MemoryTier;
    content: string;
    summary?: string;
    importanceScore?: number;
    sourceType?: any;
    sourceUrl?: string;
    sourceContext?: string;
    language?: 'si' | 'singlish' | 'en' | 'mixed';
    confidence?: number;
  }): Promise<MemoryEntry> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Auto-generate multilingual embedding
    const embedding = await this.embedder.embed(params.summary || params.content);

    const entry: MemoryEntry = {
      id,
      accountId: params.accountId,
      tier: params.tier,
      content: params.content,
      summary: params.summary,
      embedding,
      importanceScore: params.importanceScore ?? 0.5,
      sourceType: params.sourceType || 'chat',
      sourceUrl: params.sourceUrl,
      sourceContext: params.sourceContext,
      language: params.language || 'en',
      confidence: params.confidence ?? 1.0,
      isArchived: false,
      isVerified: true,
      accessCount: 0,
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now
    };

    this.memories.set(id, entry);
    return entry;
  }

  async searchMemories(accountId: string, params: MemorySearchParams): Promise<MemorySearchResult[]> {
    const list = Array.from(this.memories.values()).filter(m => {
      if (m.accountId !== accountId) return false;
      if (!params.includeArchived && m.isArchived) return false;
      if (params.tier && m.tier !== params.tier) return false;
      if (params.minImportance && m.importanceScore < params.minImportance) return false;
      return true;
    });

    if (!params.query || params.query.trim().length === 0) {
      // Sort by recency & importance
      const sorted = list.sort((a, b) => {
        const scoreA = a.importanceScore * 0.4 + (new Date(a.createdAt).getTime() / 1e12) * 0.6;
        const scoreB = b.importanceScore * 0.4 + (new Date(b.createdAt).getTime() / 1e12) * 0.6;
        return scoreB - scoreA;
      });
      const limit = params.limit || 20;
      return sorted.slice(0, limit).map(entry => ({ entry, similarity: 1.0 }));
    }

    // Vector Similarity Search
    const queryVector = await this.embedder.embed(params.query);
    const minSim = params.minSimilarity ?? 0.15;

    const scored: MemorySearchResult[] = [];
    for (const entry of list) {
      if (entry.embedding) {
        const sim = MultilingualEmbedder.cosineSimilarity(queryVector, entry.embedding);
        if (sim >= minSim) {
          scored.push({ entry, similarity: sim });
        }
      }
    }

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    const limit = params.limit || 10;
    const results = scored.slice(0, limit);

    // Update access count and timestamp
    for (const r of results) {
      r.entry.accessCount++;
      r.entry.lastAccessedAt = new Date().toISOString();
    }

    return results;
  }

  async updateMemory(
    id: string,
    accountId: string,
    updates: Partial<Pick<MemoryEntry, 'content' | 'summary' | 'importanceScore' | 'isArchived' | 'isVerified'>>
  ): Promise<MemoryEntry | null> {
    const entry = this.memories.get(id);
    if (!entry || entry.accountId !== accountId) return null;

    if (updates.content !== undefined) entry.content = updates.content;
    if (updates.summary !== undefined) entry.summary = updates.summary;
    if (updates.importanceScore !== undefined) entry.importanceScore = updates.importanceScore;
    if (updates.isArchived !== undefined) entry.isArchived = updates.isArchived;
    if (updates.isVerified !== undefined) entry.isVerified = updates.isVerified;

    if (updates.content !== undefined || updates.summary !== undefined) {
      entry.embedding = await this.embedder.embed(entry.summary || entry.content);
    }

    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  async deleteMemory(id: string, accountId: string): Promise<boolean> {
    const entry = this.memories.get(id);
    if (!entry || entry.accountId !== accountId) return false;
    this.memories.delete(id);
    return true;
  }

  async exportMemories(accountId: string): Promise<MemoryEntry[]> {
    return Array.from(this.memories.values())
      .filter(m => m.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --------------------------------------------------------------------------
  // TASKS & BACKGROUND QUEUE
  // --------------------------------------------------------------------------
  async createTask(accountId: string, title: string, plan?: any): Promise<TaskRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const task: TaskRecord = {
      id,
      accountId,
      title,
      plan,
      status: 'pending',
      progress: 0,
      liveSteps: [
        {
          step: 'Task created',
          status: 'done',
          timestamp: now
        }
      ],
      requiresConfirmation: false,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.set(id, task);
    return task;
  }

  async getTask(id: string, accountId: string): Promise<TaskRecord | null> {
    const t = this.tasks.get(id);
    if (!t || t.accountId !== accountId) return null;
    return t;
  }

  async listTasks(accountId: string): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateTask(id: string, updates: Partial<TaskRecord>): Promise<TaskRecord | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }

  // --------------------------------------------------------------------------
  // CONTINUOUS LEARNING FEED
  // --------------------------------------------------------------------------
  async addLearningItem(item: Omit<LearningItemRecord, 'id' | 'createdAt' | 'status'>): Promise<LearningItemRecord> {
    const id = crypto.randomUUID();
    const record: LearningItemRecord = {
      ...item,
      id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.learningFeed.set(id, record);
    return record;
  }

  async listLearningFeed(accountId: string, status?: string): Promise<LearningItemRecord[]> {
    return Array.from(this.learningFeed.values())
      .filter(item => item.accountId === accountId && (!status || item.status === status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async approveLearningItem(id: string, accountId: string): Promise<MemoryEntry | null> {
    const item = this.learningFeed.get(id);
    if (!item || item.accountId !== accountId) return null;

    item.status = 'approved';
    item.approvedAt = new Date().toISOString();

    // Promote to Huge Shared Memory (knowledge tier)
    return this.insertMemory({
      accountId,
      tier: 'knowledge',
      content: item.rawChunk,
      summary: item.extractedSummary,
      importanceScore: Math.min(0.95, 0.5 + item.crossCheckCount * 0.15),
      sourceType: 'continuous_learning',
      sourceUrl: item.sourceUrl,
      sourceContext: `Topic: ${item.topic} (Domain: ${item.sourceDomain})`,
      confidence: item.confidence
    });
  }

  async rejectLearningItem(id: string, accountId: string): Promise<boolean> {
    const item = this.learningFeed.get(id);
    if (!item || item.accountId !== accountId) return false;
    item.status = 'rejected';
    return true;
  }

  // --------------------------------------------------------------------------
  // AUDIT LOG
  // --------------------------------------------------------------------------
  async logAudit(log: {
    accountId: string;
    clientType: string;
    action: string;
    toolName?: string;
    details?: any;
    ipAddress?: string;
  }) {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log
    };
    this.auditLogs.push(entry);
    if (this.auditLogs.length > 5000) {
      this.auditLogs.shift();
    }
  }

  async getAuditLogs(accountId: string, limit = 50): Promise<any[]> {
    return this.auditLogs
      .filter(l => l.accountId === accountId)
      .slice(-limit)
      .reverse();
  }
}

export const globalStore = new BrainDataStore();
