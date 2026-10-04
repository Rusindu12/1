/**
 * Brain Memory Manager
 * Implements 4-tier memory architecture (chat, facts, tasks, knowledge),
 * automatic deduplication (similarity threshold > 0.88),
 * importance scoring, auto-summarization, and export capabilities.
 */

import { BrainDataStore, globalStore } from '../db/store';
import { MemoryEntry, MemoryExportFormat, MemorySearchParams, MemorySearchResult, MemoryTier, SourceType } from './types';
import { MultilingualEmbedder } from '../embeddings/embedder';

export class BrainMemoryManager {
  private store: BrainDataStore;
  private embedder: MultilingualEmbedder;

  constructor(store: BrainDataStore = globalStore) {
    this.store = store;
    this.embedder = new MultilingualEmbedder();
  }

  /**
   * Computes an importance score (0.00 to 1.00) based on content markers:
   * - Preferences ('I prefer', 'මම කැමතියි')
   * - Credentials / API keys / personal details
   * - System rules & instructions
   * - Length & density
   */
  public calculateImportanceScore(content: string, tier: MemoryTier): number {
    let score = 0.5;
    const lower = content.toLowerCase();

    if (tier === 'facts') score += 0.25;
    if (tier === 'knowledge') score += 0.15;

    // Preference markers
    if (/prefer|always|never|favorite|like|dislike|කැමති|අකමැති|නිතරම|කිසිවිටක/.test(lower)) {
      score += 0.15;
    }
    // High-value identity / credential markers
    if (/key|secret|password|token|email|phone|address|නම|මුරපදය|ගිණුම/.test(lower)) {
      score += 0.2;
    }
    // Task instructions
    if (/must|rule|don't|do not|අනිවාර්ය|වැදගත්|ප්‍රමුඛ/.test(lower)) {
      score += 0.15;
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Generates a concise summary / declarative fact from raw conversation or text.
   */
  public generateAutoSummary(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length <= 160) return trimmed;

    // Extract first 1 or 2 representative sentences
    const sentences = trimmed.split(/(?<=[.!?\n])\s+/);
    if (sentences.length > 0 && sentences[0].length >= 30) {
      return sentences.slice(0, 2).join(' ');
    }
    return trimmed.substring(0, 150) + '...';
  }

  /**
   * Saves a memory entry with automatic deduplication.
   * If a matching fact exists with similarity >= 0.88, it updates the existing entry.
   */
  async saveMemory(params: {
    accountId: string;
    tier: MemoryTier;
    content: string;
    summary?: string;
    importanceScore?: number;
    sourceType?: SourceType;
    sourceUrl?: string;
    sourceContext?: string;
    language?: 'si' | 'singlish' | 'en' | 'mixed';
    confidence?: number;
    forceNew?: boolean;
  }): Promise<{ entry: MemoryEntry; isDuplicate: boolean }> {
    const summary = params.summary || this.generateAutoSummary(params.content);
    const importance = this.calculateImportanceScore(params.content, params.tier);

    // Check for duplicates in facts / knowledge tiers
    if (!params.forceNew && (params.tier === 'facts' || params.tier === 'knowledge')) {
      const existing = await this.store.searchMemories(params.accountId, {
        query: summary,
        tier: params.tier,
        limit: 3,
        minSimilarity: 0.88
      });

      if (existing.length > 0) {
        // High similarity duplicate found: update existing record with fresher timestamp and reinforced score
        const match = existing[0].entry;
        const updated = await this.store.updateMemory(match.id, params.accountId, {
          content: params.content,
          summary: summary,
          importanceScore: Math.min(1.0, match.importanceScore + 0.05),
          isVerified: true
        });
        if (updated) {
          return { entry: updated, isDuplicate: true };
        }
      }
    }

    // Insert new memory
    const entry = await this.store.insertMemory({
      accountId: params.accountId,
      tier: params.tier,
      content: params.content,
      summary,
      importanceScore: importance,
      sourceType: params.sourceType || 'chat',
      sourceUrl: params.sourceUrl,
      sourceContext: params.sourceContext,
      language: params.language,
      confidence: params.confidence
    });

    return { entry, isDuplicate: false };
  }

  /**
   * Queries relevant memories for RAG retrieval
   */
  async retrieveContext(accountId: string, query: string, limit = 5): Promise<MemorySearchResult[]> {
    return this.store.searchMemories(accountId, {
      query,
      limit,
      minSimilarity: 0.2,
      includeArchived: false
    });
  }

  /**
   * Exports full memory data in JSON format
   */
  async exportToJSON(accountId: string): Promise<MemoryExportFormat> {
    const raw = await this.store.exportMemories(accountId);
    const cleaned = raw.map(({ embedding, ...rest }) => rest);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      accountId,
      totalEntries: cleaned.length,
      memories: cleaned
    };
  }

  /**
   * Exports memory in human-readable Markdown format
   */
  async exportToMarkdown(accountId: string): Promise<string> {
    const raw = await this.store.exportMemories(accountId);
    let md = `# AI Brain Memory Archive\n`;
    md += `*Exported on: ${new Date().toISOString()}*\n\n`;

    const tiers: MemoryTier[] = ['facts', 'knowledge', 'tasks', 'chat'];
    for (const tier of tiers) {
      const items = raw.filter(m => m.tier === tier);
      md += `## Tier: ${tier.toUpperCase()} (${items.length} items)\n\n`;
      for (const item of items) {
        md += `### [${item.importanceScore.toFixed(2)}] ${item.summary || item.content.slice(0, 60)}\n`;
        md += `- **Date**: ${item.createdAt}\n`;
        md += `- **Source**: ${item.sourceType} ${item.sourceUrl ? `(${item.sourceUrl})` : ''}\n`;
        md += `- **Language**: ${item.language}\n`;
        md += `\n> ${item.content.replace(/\n/g, '\n> ')}\n\n---\n\n`;
      }
    }

    return md;
  }
}

export const brainMemory = new BrainMemoryManager();
