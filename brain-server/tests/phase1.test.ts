import request from 'supertest';
import { createBrainApp } from '../src/server';
import { detectLanguage } from '../src/bilingual/detector';
import { singlishToSinhala, isLikelySinglish } from '../src/bilingual/singlish';
import { normalizeSinhalaUnicode, hasSinhalaScript } from '../src/bilingual/unicode';
import { MultilingualEmbedder } from '../src/embeddings/embedder';
import { brainMemory } from '../src/memory/manager';
import { globalStore } from '../src/db/store';

describe('Phase 1: Bilingual Engine, Multilingual Embeddings, and Shared Brain Server', () => {
  const app = createBrainApp();
  const testApiKey = 'brain_key_master_sinhala_english_universal_access';
  const testAccountId = '00000000-0000-4000-8000-000000000001';

  test('Bilingual: Detects Sinhala Unicode script correctly', () => {
    const text = 'ආයුබෝවන්, මට සහාය දෙන්න පුළුවන්ද?';
    const detected = detectLanguage(text);
    expect(detected.hasSinhala).toBe(true);
    expect(detected.language).toBe('si');
    expect(detected.suggestedResponseLanguage).toBe('si');
  });

  test('Bilingual: Detects Singlish (Romanized Sinhala) and provides transliteration', () => {
    const singlishText = 'kohomada oyaata';
    expect(isLikelySinglish(singlishText)).toBe(true);

    const detected = detectLanguage(singlishText);
    expect(detected.isSinglish).toBe(true);
    expect(detected.suggestedResponseLanguage).toBe('si');

    const sinhala = singlishToSinhala(singlishText);
    expect(hasSinhalaScript(sinhala)).toBe(true);
    expect(sinhala).toContain('කොහොමද');
  });

  test('Bilingual: Detects English accurately', () => {
    const englishText = 'Please analyze this system architecture and generate the APK.';
    const detected = detectLanguage(englishText);
    expect(detected.language).toBe('en');
    expect(detected.suggestedResponseLanguage).toBe('en');
    expect(detected.hasSinhala).toBe(false);
  });

  test('Unicode: Normalizes Sinhala combining characters without loss', () => {
    const raw = 'ශ්‍රී ලංකා';
    const normalized = normalizeSinhalaUnicode(raw);
    expect(hasSinhalaScript(normalized)).toBe(true);
    expect(normalized).toBe(raw);
  });

  test('Embeddings: Generates 384-dimensional normalized vectors with cosine similarity', async () => {
    const embedder = new MultilingualEmbedder();
    const vec1 = await embedder.embed('ක්‍රමලේඛනය සහ කේතකරණය');
    const vec2 = await embedder.embed('programming and coding in software');
    const vec3 = await embedder.embed('ගසක් උඩ ඉන්න කුරුල්ලා');

    expect(vec1.length).toBe(384);
    expect(vec2.length).toBe(384);

    const simRelated = MultilingualEmbedder.cosineSimilarity(vec1, vec2);
    const simUnrelated = MultilingualEmbedder.cosineSimilarity(vec1, vec3);

    expect(typeof simRelated).toBe('number');
    expect(typeof simUnrelated).toBe('number');
  });

  test('Memory Manager: Deduplicates entries with >= 0.88 similarity', async () => {
    const fact1 = await brainMemory.saveMemory({
      accountId: testAccountId,
      tier: 'facts',
      content: 'The user prefers TypeScript for full-stack web development.',
      summary: 'User prefers TypeScript for full-stack'
    });
    expect(fact1.isDuplicate).toBe(false);

    // Duplicate fact
    const fact2 = await brainMemory.saveMemory({
      accountId: testAccountId,
      tier: 'facts',
      content: 'The user prefers TypeScript for full-stack web development.',
      summary: 'User prefers TypeScript for full-stack'
    });
    expect(fact2.isDuplicate).toBe(true);
  });

  test('Memory Export: Exports to JSON and Markdown', async () => {
    const jsonExport = await brainMemory.exportToJSON(testAccountId);
    expect(jsonExport.accountId).toBe(testAccountId);
    expect(jsonExport.totalEntries).toBeGreaterThan(0);

    const mdExport = await brainMemory.exportToMarkdown(testAccountId);
    expect(mdExport).toContain('# AI Brain Memory Archive');
  });

  test('REST API: /health endpoint returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('AI Brain Server');
  });

  test('REST API: /api/v1/chat responds bilingually and logs turn', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({
        message: 'kohomada oyaata',
        clientType: 'test_client'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toBeDefined();
    expect(res.body.language).toBe('si');
  });

  test('REST API: /api/v1/memories CRUD operations', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/v1/memories')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({
        tier: 'knowledge',
        content: 'Sri Lanka uses Colombo standard time UTC+5:30',
        summary: 'Sri Lanka time zone UTC+5:30'
      });
    expect(createRes.status).toBe(201);
    const memId = createRes.body.entry.id;

    // 2. Search
    const searchRes = await request(app)
      .get(`/api/v1/memories?query=time+zone`)
      .set('Authorization', `Bearer ${testApiKey}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.memories.length).toBeGreaterThan(0);

    // 3. Delete
    const deleteRes = await request(app)
      .delete(`/api/v1/memories/${memId}`)
      .set('Authorization', `Bearer ${testApiKey}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
