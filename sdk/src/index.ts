/**
 * @aibrain/sdk - Official Client SDK for AI Brain
 * Connects any Web, Mobile (React Native), or Node.js app to AI Brain.
 */

export interface BrainClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ChatResult {
  reply: string;
  language: 'si' | 'en' | 'singlish';
  toolCalls?: any[];
  retrievedMemories?: any[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
}

export interface MemoryEntryInput {
  tier: 'chat' | 'facts' | 'tasks' | 'knowledge';
  content: string;
  summary?: string;
  importanceScore?: number;
  sourceType?: string;
  sourceUrl?: string;
}

export class AIBrainClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: BrainClientOptions) {
    if (!options.apiKey) {
      throw new Error('AIBrainClient requires an apiKey');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:3000').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs || 25000;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Client-SDK': '@aibrain/sdk/1.0.0',
          ...(options.headers as any || {})
        }
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`AI Brain API error (${res.status}): ${errorBody}`);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Universal Bilingual Chat (Auto-detects Sinhala / Singlish / English)
   */
  async chat(message: string, clientType = 'sdk_app'): Promise<ChatResult> {
    const res = await this.request<any>('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message, clientType })
    });
    return {
      reply: res.reply,
      language: res.language,
      toolCalls: res.toolCalls,
      retrievedMemories: res.retrievedMemories,
      usage: res.usage
    };
  }

  /**
   * Language detection & Singlish transliteration
   */
  bilingual = {
    detect: async (text: string) => {
      const res = await this.request<any>('/api/v1/chat/detect-language', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      return res.detection;
    },
    transliterateSinglish: async (text: string) => {
      const res = await this.request<any>('/api/v1/chat/transliterate', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      return res.sinhala;
    }
  };

  /**
   * Shared Memory Subsystem (CRUD + Vector Similarity Search)
   */
  memories = {
    search: async (query: string, tier?: string, limit = 10) => {
      let q = `/api/v1/memories?query=${encodeURIComponent(query)}&limit=${limit}`;
      if (tier) q += `&tier=${encodeURIComponent(tier)}`;
      const res = await this.request<any>(q);
      return res.memories;
    },
    add: async (entry: MemoryEntryInput) => {
      const res = await this.request<any>('/api/v1/memories', {
        method: 'POST',
        body: JSON.stringify(entry)
      });
      return res.entry;
    },
    delete: async (id: string) => {
      const res = await this.request<any>(`/api/v1/memories/${id}`, {
        method: 'DELETE'
      });
      return res.success;
    },
    exportUrl: (format: 'json' | 'markdown' = 'json') => {
      return `${this.baseUrl}/api/v1/memories/export?format=${format}&apiKey=${this.apiKey}`;
    }
  };

  /**
   * Autonomous Task Execution
   */
  tasks = {
    create: async (title: string) => {
      const res = await this.request<any>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      return res.task;
    },
    get: async (id: string) => {
      const res = await this.request<any>(`/api/v1/tasks/${id}`);
      return res.task;
    },
    confirm: async (id: string, confirmed: boolean) => {
      const res = await this.request<any>(`/api/v1/tasks/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ confirmed })
      });
      return res.task;
    }
  };
}
