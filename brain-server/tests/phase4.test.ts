import fs from 'fs';
import path from 'path';
import { createBrainApp } from '../src/server';
import { AIBrainClient } from '../../sdk/src/index';

describe('Phase 4: System-Wide Access (Android APK, Web Extension, REST SDK)', () => {
  const app = createBrainApp();
  let server: any;
  let port: number;
  let sdkClient: AIBrainClient;
  const testApiKey = 'brain_key_master_sinhala_english_universal_access';

  beforeAll((done) => {
    // Start temporary test server for SDK integration verification
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      sdkClient = new AIBrainClient({
        apiKey: testApiKey,
        baseUrl: `http://127.0.0.1:${port}`
      });
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  test('Android Manifest: Verifies system-wide overlay, accessibility, share, and selection intent filters', () => {
    const manifestPath = path.join(__dirname, '../../android/app/src/main/AndroidManifest.xml');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    expect(manifestContent).toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(manifestContent).toContain('android.permission.BIND_ACCESSIBILITY_SERVICE');
    expect(manifestContent).toContain('android.intent.action.SEND');
    expect(manifestContent).toContain('android.intent.action.PROCESS_TEXT');
    expect(manifestContent).toContain('android.service.voice.VoiceInteractionService');
    expect(manifestContent).toContain('BrainBubbleService');
    expect(manifestContent).toContain('BrainAccessibilityService');
  });

  test('Android Kotlin Native: Verifies Bubble Service and Accessibility Service implementations', () => {
    const bubblePath = path.join(__dirname, '../../android/app/src/main/java/com/aibrain/app/BrainBubbleService.kt');
    const accessPath = path.join(__dirname, '../../android/app/src/main/java/com/aibrain/app/BrainAccessibilityService.kt');
    const bridgePath = path.join(__dirname, '../../android/app/src/main/java/com/aibrain/app/BrainBridgeModule.kt');

    expect(fs.existsSync(bubblePath)).toBe(true);
    expect(fs.existsSync(accessPath)).toBe(true);
    expect(fs.existsSync(bridgePath)).toBe(true);

    const accessCode = fs.readFileSync(accessPath, 'utf8');
    expect(accessCode).toContain('AccessibilityService()');
    expect(accessCode).toContain('showPrivacyIndicatorNotification');
  });

  test('Browser Extension: Validates Manifest V3 and background worker', () => {
    const manifestPath = path.join(__dirname, '../../extension/manifest.json');
    const backgroundPath = path.join(__dirname, '../../extension/background.js');
    const contentPath = path.join(__dirname, '../../extension/content.js');

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(backgroundPath)).toBe(true);
    expect(fs.existsSync(contentPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('contextMenus');
    expect(manifest.permissions).toContain('storage');
  });

  test('Client SDK: Universal chat call via SDK', async () => {
    const chatRes = await sdkClient.chat('kohomada oyaata');
    expect(chatRes.reply).toBeDefined();
    expect(chatRes.language).toBe('si');
  });

  test('Client SDK: Bilingual detection & Singlish transliteration via SDK', async () => {
    const detected = await sdkClient.bilingual.detect('subha udasanak');
    expect(detected.isSinglish).toBe(true);

    const sinhala = await sdkClient.bilingual.transliterateSinglish('sthuthiyi');
    expect(sinhala).toContain('ස්තූතියි');
  });

  test('Client SDK: Shared memory addition and search via SDK', async () => {
    const entry = await sdkClient.memories.add({
      tier: 'facts',
      content: 'User prefers dark mode UI for all clients',
      summary: 'User preference: dark mode'
    });
    expect(entry.id).toBeDefined();

    const results = await sdkClient.memories.search('dark mode');
    expect(results.length).toBeGreaterThan(0);
  });
});
