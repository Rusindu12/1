/**
 * Continuous Internet Learning Background Worker
 * Discovers topics from past user tasks and interests, searches the web,
 * fetches, cleans, chunks, embeds, cross-checks multiple sources,
 * and feeds candidates to the Learning Feed for user approval.
 */

import { BrainDataStore, globalStore } from '../db/store';
import { webSearchTool } from '../tools/webSearch';
import { fetchPageTool } from '../tools/fetchPage';
import { factCrossChecker, SourceClaim } from './crossChecker';
import { brainMemory } from '../memory/manager';

export class ContinuousLearningWorker {
  private store: BrainDataStore;
  private isRunning = false;
  private intervalTimer?: NodeJS.Timeout;

  constructor(store: BrainDataStore = globalStore) {
    this.store = store;
  }

  /**
   * Starts scheduled background learning loop (e.g. every hour or on trigger)
   */
  startScheduler(intervalMinutes = 60, accountId = '00000000-0000-4000-8000-000000000001') {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Continuous Learning] Background worker scheduler started (Interval: ${intervalMinutes}m)`);

    this.intervalTimer = setInterval(async () => {
      try {
        await this.runLearningCycle(accountId);
      } catch (err: any) {
        console.error('[Continuous Learning] Cycle failed:', err.message);
      }
    }, intervalMinutes * 60 * 1000);
  }

  stopScheduler() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
    this.isRunning = false;
  }

  /**
   * Executes a single continuous learning cycle for a specific topic or inferred interest
   */
  async runLearningCycle(accountId: string, customTopic?: string): Promise<{
    topic: string;
    itemsLearned: number;
    feedIds: string[];
  }> {
    const topic = customTopic || (await this.discoverNextTopic(accountId));
    console.log(`[Continuous Learning] Starting crawl cycle for topic: "${topic}"`);

    // 1. Search web for authoritative sources
    const searchRes = await webSearchTool.search(topic, 4);
    if (!searchRes.results || searchRes.results.length === 0) {
      return { topic, itemsLearned: 0, feedIds: [] };
    }

    const fetchedClaims: SourceClaim[] = [];
    const feedIds: string[] = [];

    // 2. Fetch, clean, and chunk each search result
    for (const item of searchRes.results) {
      try {
        const page = await fetchPageTool.fetchAndClean(item.url);
        const topChunk = page.chunks.length > 0 ? page.chunks[0].text : page.cleanedMarkdown.slice(0, 500);

        const claim: SourceClaim = {
          domain: page.domain,
          url: page.url,
          summary: brainMemory.generateAutoSummary(topChunk),
          timestamp: new Date().toISOString()
        };
        fetchedClaims.push(claim);

        // 3. Cross-check across independent sources
        const checkResult = await factCrossChecker.crossCheck(claim, fetchedClaims);

        // 4. Save to Learning Feed for user approval (store summaries + links, not full copies)
        const feedItem = await this.store.addLearningItem({
          accountId,
          topic,
          sourceUrl: claim.url,
          sourceDomain: claim.domain,
          extractedSummary: claim.summary,
          rawChunk: topChunk.slice(0, 400),
          confidence: checkResult.consolidatedConfidence,
          crossCheckCount: checkResult.crossCheckCount,
          crossCheckSources: checkResult.sources
        });

        feedIds.push(feedItem.id);
      } catch (err: any) {
        console.warn(`[Continuous Learning] Could not process ${item.url}:`, err.message);
      }
    }

    console.log(`[Continuous Learning] Cycle finished: ${feedIds.length} candidate insights placed in Learning Feed.`);
    return {
      topic,
      itemsLearned: feedIds.length,
      feedIds
    };
  }

  /**
   * Discovers the next learning topic from past tasks and stored memories
   */
  private async discoverNextTopic(accountId: string): Promise<string> {
    const defaultTopics = [
      'Sinhala NLP Machine Translation and Language Models',
      'Android 14 Accessibility Service best practices',
      'Vector Similarity Search algorithms pgvector HNSW',
      'Artificial General Intelligence memory architectures'
    ];

    try {
      const recentTasks = await this.store.listTasks(accountId);
      if (recentTasks.length > 0) {
        return recentTasks[0].title;
      }
    } catch (e) {}

    // Random choice from seeds
    const idx = Math.floor(Math.random() * defaultTopics.length);
    return defaultTopics[idx];
  }
}

export const continuousLearningWorker = new ContinuousLearningWorker();
