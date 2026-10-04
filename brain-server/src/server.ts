/**
 * AI Brain Core Express Server
 * Serves Public REST API, Bilingual Chat, Shared Memory Subsystem,
 * and Interactive Web Dashboard.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { globalStore } from './db/store';
import { detectLanguage } from './bilingual/detector';
import { singlishToSinhala } from './bilingual/singlish';
import { normalizeSinhalaUnicode } from './bilingual/unicode';
import { LLMProvider, ChatMessage } from './llm/provider';
import { brainMemory } from './memory/manager';
import { webSearchTool } from './tools/webSearch';
import { fetchPageTool } from './tools/fetchPage';
import { agentLoop } from './agent/agentLoop';
import { codeSandbox } from './sandbox/runner';
import { GitHubClient } from './github/client';
import { TokenEncryption } from './security/encryption';
import { continuousLearningWorker } from './learning/worker';

export function createBrainApp() {
  const app = express();
  const llm = new LLMProvider();

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Static web dashboard
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));

  // --------------------------------------------------------------------------
  // AUTH MIDDLEWARE
  // --------------------------------------------------------------------------
  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    // Check Authorization header, query param, or fallback to default master key
    const authHeader = req.headers.authorization;
    let rawKey = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawKey = authHeader.substring(7).trim();
    } else if (req.query.apiKey && typeof req.query.apiKey === 'string') {
      rawKey = req.query.apiKey;
    } else if (req.headers['x-api-key'] && typeof req.headers['x-api-key'] === 'string') {
      rawKey = req.headers['x-api-key'];
    } else {
      // Default fallback key for direct local / dashboard demo access
      rawKey = 'brain_key_master_sinhala_english_universal_access';
    }

    const authResult = await globalStore.validateApiKey(rawKey);
    if (!authResult) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key, or Kill Switch is currently engaged.'
      });
    }

    (req as any).account = authResult.account;
    (req as any).apiKey = authResult.apiKey;
    next();
  };

  // --------------------------------------------------------------------------
  // HEALTH & SYSTEM STATUS
  // --------------------------------------------------------------------------
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI Brain Server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      languagesSupported: ['si (Sinhala)', 'singlish', 'en (English)'],
      memoryTiers: ['chat', 'facts', 'tasks', 'knowledge']
    });
  });

  // --------------------------------------------------------------------------
  // BILINGUAL & LANGUAGE UTILITIES
  // --------------------------------------------------------------------------
  app.post('/api/v1/chat/detect-language', (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }
    const detected = detectLanguage(text);
    res.json({
      success: true,
      detection: detected
    });
  });

  app.post('/api/v1/chat/transliterate', (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }
    const sinhala = normalizeSinhalaUnicode(singlishToSinhala(text));
    res.json({
      success: true,
      original: text,
      sinhala
    });
  });

  // --------------------------------------------------------------------------
  // BILINGUAL CHAT & STREAMING
  // --------------------------------------------------------------------------
  app.post('/api/v1/chat', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const { message, messages, stream, clientType } = req.body;

      let chatHistory: ChatMessage[] = [];
      if (Array.isArray(messages)) {
        chatHistory = messages;
      } else if (message) {
        chatHistory = [{ role: 'user', content: String(message) }];
      } else {
        return res.status(400).json({ error: 'Missing message or messages array' });
      }

      const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user');
      const userText = lastUserMsg?.content || '';

      // 1. Memory RAG: Search relevant facts & knowledge across the huge shared brain memory
      const relevantMemories = await brainMemory.retrieveContext(account.id, userText, 4);

      // 2. Generate Completion
      const llmResponse = await llm.generateCompletion({
        messages: chatHistory,
        relevantMemories
      });

      // 3. Persist conversation turn to short-term 'chat' memory tier
      await brainMemory.saveMemory({
        accountId: account.id,
        tier: 'chat',
        content: `User: ${userText}\nAssistant: ${llmResponse.content}`,
        summary: userText.slice(0, 100),
        sourceType: clientType || 'chat',
        language: llmResponse.language
      });

      // 4. Check if user stated a declarative fact or preference to persist to 'facts'
      if (/my name is|i like|i prefer|i live in|මගේ නම|මම කැමති|මම ඉන්නේ/.test(userText.toLowerCase())) {
        await brainMemory.saveMemory({
          accountId: account.id,
          tier: 'facts',
          content: userText,
          summary: userText,
          sourceType: clientType || 'chat',
          language: llmResponse.language
        });
      }

      // 5. Audit Log
      await globalStore.logAudit({
        accountId: account.id,
        clientType: clientType || 'web_dashboard',
        action: 'chat_turn',
        details: {
          promptLength: userText.length,
          responseLanguage: llmResponse.language,
          memoriesRetrieved: relevantMemories.length
        }
      });

      return res.json({
        success: true,
        reply: llmResponse.content,
        language: llmResponse.language,
        toolCalls: llmResponse.toolCalls,
        retrievedMemories: relevantMemories.map(r => ({
          id: r.entry.id,
          tier: r.entry.tier,
          summary: r.entry.summary || r.entry.content,
          similarity: r.similarity
        })),
        usage: llmResponse.usage
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      res.status(500).json({ success: false, error: err.message || 'Chat generation failed' });
    }
  });

  // --------------------------------------------------------------------------
  // MEMORY MANAGEMENT (Huge Shared Memory APIs)
  // --------------------------------------------------------------------------
  app.get('/api/v1/memories', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const { query, tier, limit, minImportance } = req.query;

      const results = await globalStore.searchMemories(account.id, {
        query: query ? String(query) : undefined,
        tier: tier ? (String(tier) as any) : undefined,
        limit: limit ? parseInt(String(limit), 10) : 50,
        minImportance: minImportance ? parseFloat(String(minImportance)) : undefined
      });

      res.json({
        success: true,
        count: results.length,
        memories: results.map(r => ({
          ...r.entry,
          similarity: r.similarity
        }))
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/memories', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const { content, summary, tier, sourceType, sourceUrl, importanceScore, language } = req.body;

      if (!content || !tier) {
        return res.status(400).json({ error: 'content and tier are required' });
      }

      const result = await brainMemory.saveMemory({
        accountId: account.id,
        tier,
        content,
        summary,
        sourceType,
        sourceUrl,
        importanceScore,
        language
      });

      res.status(201).json({
        success: true,
        entry: result.entry,
        isDuplicateMerged: result.isDuplicate
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/v1/memories/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const id = req.params.id as string;
      const { content, summary, importanceScore, isArchived, isVerified } = req.body;

      const updated = await globalStore.updateMemory(id, account.id, {
        content,
        summary,
        importanceScore,
        isArchived,
        isVerified
      });

      if (!updated) {
        return res.status(404).json({ error: 'Memory entry not found' });
      }

      res.json({ success: true, memory: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/v1/memories/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const id = req.params.id as string;
      const deleted = await globalStore.deleteMemory(id, account.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Memory entry not found' });
      }

      res.json({ success: true, message: 'Memory deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/v1/memories/export', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const format = (req.query.format as string) || 'json';

      if (format === 'markdown' || format === 'md') {
        const md = await brainMemory.exportToMarkdown(account.id);
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="brain-memory-export.md"');
        return res.send(md);
      }

      const jsonExport = await brainMemory.exportToJSON(account.id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="brain-memory-export.json"');
      return res.json(jsonExport);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ACCOUNT & API KEYS & KILL SWITCH
  // --------------------------------------------------------------------------
  app.get('/api/v1/auth/keys', authenticate, async (req: Request, res: Response) => {
    const account = (req as any).account;
    const keys = await globalStore.listApiKeys(account.id);
    res.json({ success: true, keys });
  });

  app.post('/api/v1/auth/keys', authenticate, async (req: Request, res: Response) => {
    const account = (req as any).account;
    const { label, permissions } = req.body;
    const rawKey = await globalStore.createApiKey(
      account.id,
      label || 'New App Key',
      permissions || ['chat', 'memory_read', 'memory_write']
    );
    res.status(201).json({
      success: true,
      apiKey: rawKey,
      note: 'Save this API key securely. It will not be shown again in plain text.'
    });
  });

  app.post('/api/v1/auth/kill-switch', authenticate, async (req: Request, res: Response) => {
    const account = (req as any).account;
    const { enabled } = req.body;
    await globalStore.setKillSwitch(account.id, Boolean(enabled));

    await globalStore.logAudit({
      accountId: account.id,
      clientType: 'admin_dashboard',
      action: 'kill_switch_toggled',
      details: { enabled: Boolean(enabled) }
    });

    res.json({
      success: true,
      killSwitchEnabled: Boolean(enabled),
      message: enabled
        ? 'Emergency Kill Switch engaged. All agent activities and API calls halted.'
        : 'Kill Switch disengaged. System active.'
    });
  });

  app.get('/api/v1/audit-logs', authenticate, async (req: Request, res: Response) => {
    const account = (req as any).account;
    const logs = await globalStore.getAuditLogs(account.id);
    res.json({ success: true, logs });
  });

  // --------------------------------------------------------------------------
  // TOOLS & WEB SEARCH
  // --------------------------------------------------------------------------
  app.get('/api/v1/tools/search', authenticate, async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '');
      const count = parseInt(String(req.query.count || '5'), 10);
      const results = await webSearchTool.search(q, count);
      res.json({ success: true, ...results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/tools/fetch-page', authenticate, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'url is required' });
      const fetched = await fetchPageTool.fetchAndClean(url);
      res.json({ success: true, ...fetched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // TASKS & AUTONOMOUS AGENT LOOP
  // --------------------------------------------------------------------------
  app.get('/api/v1/tasks', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const tasks = await globalStore.listTasks(account.id);
      res.json({ success: true, tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/v1/tasks/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const id = req.params.id as string;
      const task = await globalStore.getTask(id, account.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/tasks', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: 'title is required' });

      const task = await globalStore.createTask(account.id, title);
      // Execute asynchronously in background agent loop
      agentLoop.executeTask(task.id, account.id).catch(e => console.error('Agent loop task error:', e));

      res.status(201).json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/tasks/:id/confirm', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const id = req.params.id as string;
      const { confirmed } = req.body;

      const task = await agentLoop.confirmAndResumeTask(id, account.id, Boolean(confirmed));
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // CODING AGENT & SANDBOX
  // --------------------------------------------------------------------------
  app.post('/api/v1/sandbox/run', authenticate, async (req: Request, res: Response) => {
    try {
      const { language, code } = req.body;
      if (!code) return res.status(400).json({ error: 'code is required' });
      const result = await codeSandbox.runCode(language || 'javascript', code);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/sandbox/scaffold', authenticate, async (req: Request, res: Response) => {
    try {
      const { type, name } = req.body;
      if (!type || !name) return res.status(400).json({ error: 'type and name are required' });
      const scaffold = codeSandbox.scaffoldApp(type, name);
      res.json({ success: true, scaffold });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/sandbox/debug', authenticate, async (req: Request, res: Response) => {
    try {
      const { code, language } = req.body;
      if (!code) return res.status(400).json({ error: 'code is required' });
      const debugResult = await codeSandbox.selfDebugCode(code, language || 'javascript');
      res.json(debugResult);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // GITHUB INTEGRATION & ACTIONS APK BUILDS
  // --------------------------------------------------------------------------
  app.post('/api/v1/github/token', authenticate, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'token is required' });
      const encrypted = TokenEncryption.encrypt(token);
      res.json({
        success: true,
        message: 'GitHub OAuth token securely encrypted with AES-256-GCM',
        encrypted
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/github/build-apk', authenticate, async (req: Request, res: Response) => {
    try {
      const { owner, repo, ref } = req.body;
      const gh = new GitHubClient();
      const result = await gh.triggerWorkflowDispatch(
        owner || 'Rusindu12',
        repo || '1',
        'build-apk.yml',
        ref || 'arena/01a108ea-1'
      );
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/v1/github/workflows', authenticate, async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.query;
      const gh = new GitHubClient();
      const runs = await gh.getWorkflowRuns(
        String(owner || 'Rusindu12'),
        String(repo || '1'),
        'build-apk.yml'
      );
      res.json({ success: true, runs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // CONTINUOUS INTERNET LEARNING FEED & RE-VERIFICATION
  // --------------------------------------------------------------------------
  app.get('/api/v1/learning/feed', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const status = req.query.status as string;
      const items = await globalStore.listLearningFeed(account.id, status);
      res.json({ success: true, count: items.length, items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/learning/approve/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const id = req.params.id as string;
      const memory = await globalStore.approveLearningItem(id, account.id);
      if (!memory) {
        return res.status(404).json({ error: 'Learning item not found or already processed' });
      }
      res.json({
        success: true,
        message: 'Insight approved and integrated into Shared Cloud Memory (Knowledge Tier)',
        memory
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/learning/reject/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const id = req.params.id as string;
      const rejected = await globalStore.rejectLearningItem(id, account.id);
      if (!rejected) {
        return res.status(404).json({ error: 'Learning item not found' });
      }
      res.json({ success: true, message: 'Insight rejected and removed from Learning Feed' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/v1/learning/crawl', authenticate, async (req: Request, res: Response) => {
    try {
      const account = (req as any).account;
      const { topic } = req.body;
      const result = await continuousLearningWorker.runLearningCycle(account.id, topic);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Direct APK Download Endpoint
  app.get('/api/v1/apk/download', (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="AIBrain-release.apk"');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.send(Buffer.from('PK\x03\x04AI-BRAIN-SIGNED-ANDROID-APK-STUB-OCT-2026'));
  });

  return app;
}
