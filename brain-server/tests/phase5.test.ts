import request from 'supertest';
import { createBrainApp } from '../src/server';
import { factCrossChecker, SourceClaim } from '../src/learning/crossChecker';
import { continuousLearningWorker } from '../src/learning/worker';
import { globalStore } from '../src/db/store';

describe('Phase 5: Continuous Internet Learning & Fact Verification', () => {
  const app = createBrainApp();
  const testApiKey = 'brain_key_master_sinhala_english_universal_access';
  const testAccountId = '00000000-0000-4000-8000-000000000001';

  test('Cross-Checker: Validates corroboration across multiple independent domains', async () => {
    const claim1: SourceClaim = {
      domain: 'wikipedia.org',
      url: 'https://en.wikipedia.org/wiki/Sinhala_language',
      summary: 'Sinhala is spoken by over 16 million people in Sri Lanka and uses Unicode U+0D80.',
      timestamp: new Date().toISOString()
    };

    const claim2: SourceClaim = {
      domain: 'omniglot.com',
      url: 'https://omniglot.com/writing/sinhala.htm',
      summary: 'The Sinhala language and script is native to Sri Lanka with 16 million speakers.',
      timestamp: new Date().toISOString()
    };

    const result = await factCrossChecker.crossCheck(claim1, [claim2]);
    expect(result.crossCheckCount).toBe(2);
    expect(result.isCorroborated).toBe(true);
    expect(result.consolidatedConfidence).toBeGreaterThanOrEqual(0.85);
    expect(result.sources).toContain(claim1.url);
    expect(result.sources).toContain(claim2.url);
  });

  test('Continuous Learning Cycle: Crawls topic, chunks, cross-checks and populates learning feed', async () => {
    const res = await continuousLearningWorker.runLearningCycle(testAccountId, 'AI Agents and Cloud Memory');
    expect(res.topic).toBe('AI Agents and Cloud Memory');
    expect(res.itemsLearned).toBeGreaterThan(0);
    expect(res.feedIds.length).toBeGreaterThan(0);

    // Verify items in feed table
    const feedItems = await globalStore.listLearningFeed(testAccountId, 'pending');
    expect(feedItems.length).toBeGreaterThan(0);
    expect(feedItems[0].sourceUrl).toBeDefined();
    expect(feedItems[0].confidence).toBeGreaterThan(0.7);
  });

  test('Learning Feed Approval: Promotes approved item into Huge Shared Memory (Knowledge Tier)', async () => {
    const feedItems = await globalStore.listLearningFeed(testAccountId, 'pending');
    expect(feedItems.length).toBeGreaterThan(0);
    const itemToApprove = feedItems[0];

    // Approve item
    const promotedMemory = await globalStore.approveLearningItem(itemToApprove.id, testAccountId);
    expect(promotedMemory).toBeDefined();
    expect(promotedMemory?.tier).toBe('knowledge');
    expect(promotedMemory?.sourceType).toBe('continuous_learning');

    // Verify search finds this newly learned knowledge
    const searchRes = await globalStore.searchMemories(testAccountId, {
      tier: 'knowledge',
      query: itemToApprove.topic
    });
    expect(searchRes.length).toBeGreaterThan(0);
  });

  test('Learning Feed Rejection: Purges rejected item from pending list', async () => {
    const item = await globalStore.addLearningItem({
      accountId: testAccountId,
      topic: 'Deprecated legacy API facts',
      sourceUrl: 'https://example.com/deprecated',
      sourceDomain: 'example.com',
      extractedSummary: 'This fact is deprecated and inaccurate.',
      rawChunk: 'Legacy chunk text',
      confidence: 0.5,
      crossCheckCount: 1,
      crossCheckSources: ['https://example.com/deprecated']
    });

    const rejected = await globalStore.rejectLearningItem(item.id, testAccountId);
    expect(rejected).toBe(true);

    const pending = await globalStore.listLearningFeed(testAccountId, 'pending');
    expect(pending.some(i => i.id === item.id)).toBe(false);
  });

  test('REST API: Learning feed & approval endpoints', async () => {
    // 1. List feed
    const feedRes = await request(app)
      .get('/api/v1/learning/feed')
      .set('Authorization', `Bearer ${testApiKey}`);
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.success).toBe(true);

    // 2. Direct APK download route check
    const apkRes = await request(app).get('/api/v1/apk/download');
    expect(apkRes.status).toBe(200);
    expect(apkRes.headers['content-type']).toContain('application/vnd.android.package-archive');
  });
});
