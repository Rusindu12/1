/**
 * Memory Tier & Subsystem Type Definitions
 */

export type MemoryTier = 'chat' | 'facts' | 'tasks' | 'knowledge';

export type SourceType =
  | 'chat'
  | 'android_accessibility'
  | 'android_share'
  | 'android_bubble'
  | 'web_extension'
  | 'web_dashboard'
  | 'continuous_learning'
  | 'coding_task'
  | 'task'
  | 'api';

export interface MemoryEntry {
  id: string;
  accountId: string;
  tier: MemoryTier;
  content: string;
  summary?: string;
  embedding?: number[];
  importanceScore: number; // 0.0 to 1.0
  sourceType: SourceType;
  sourceUrl?: string;
  sourceContext?: string;
  language: 'si' | 'singlish' | 'en' | 'mixed';
  confidence: number;
  isArchived: boolean;
  isVerified: boolean;
  accessCount: number;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySearchParams {
  query?: string;
  tier?: MemoryTier;
  limit?: number;
  minImportance?: number;
  minSimilarity?: number;
  includeArchived?: boolean;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  similarity: number;
}

export interface MemoryExportFormat {
  version: string;
  exportedAt: string;
  accountId: string;
  totalEntries: number;
  memories: Omit<MemoryEntry, 'embedding'>[];
}
