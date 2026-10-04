import request from 'supertest';
import { createBrainApp } from '../src/server';
import { TokenEncryption } from '../src/security/encryption';
import { codeSandbox } from '../src/sandbox/runner';
import { GitHubClient } from '../src/github/client';

describe('Phase 3: Coding Agent, Sandbox & Encrypted GitHub Integration', () => {
  const app = createBrainApp();
  const testApiKey = 'brain_key_master_sinhala_english_universal_access';

  test('Encryption: Securely encrypts and decrypts GitHub OAuth tokens with AES-256-GCM', () => {
    const rawToken = 'ghp_secretTokenForGitHubActions1234567890';
    const encrypted = TokenEncryption.encrypt(rawToken);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.ciphertext).not.toEqual(rawToken);

    const decrypted = TokenEncryption.decrypt(encrypted);
    expect(decrypted).toEqual(rawToken);
  });

  test('Sandbox: Executes JavaScript in isolated process and captures stdout', async () => {
    const code = `
      const x = 10;
      const y = 20;
      console.log('RESULT=' + (x + y));
    `;
    const res = await codeSandbox.runCode('javascript', code);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('RESULT=30');
    expect(res.stderr).toBe('');
    expect(res.durationMs).toBeGreaterThan(0);
  });

  test('Sandbox: Executes Python code and captures output', async () => {
    const pyCode = `
def sinhala_greeting():
    print("SUBHA UDASANAK")

sinhala_greeting()
    `;
    const res = await codeSandbox.runCode('python', pyCode);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('SUBHA UDASANAK');
  });

  test('Scaffolder: Generates full application scaffolds for React Native, Next.js, and Android', () => {
    const rnScaffold = codeSandbox.scaffoldApp('react_native', 'AI Brain Mobile');
    expect(rnScaffold.files.some(f => f.path === 'package.json')).toBe(true);
    expect(rnScaffold.files.some(f => f.path === 'App.tsx')).toBe(true);

    const nextScaffold = codeSandbox.scaffoldApp('nextjs', 'AI Brain Web');
    expect(nextScaffold.files.some(f => f.path === 'pages/index.tsx')).toBe(true);

    const androidScaffold = codeSandbox.scaffoldApp('android_kotlin', 'AI Brain Android Native');
    expect(androidScaffold.files.some(f => f.path.includes('BrainBubbleService.kt'))).toBe(true);
  });

  test('Self-Debugging Loop: Auto-fixes code errors and re-verifies execution', async () => {
    // Code with missing variable definition (ReferenceError)
    const buggyCode = `
      console.log('Variable value: ' + missingConfigValue);
    `;
    const res = await codeSandbox.selfDebugCode(buggyCode, 'javascript', 3);
    expect(res.success).toBe(true);
    expect(res.attempts).toBeGreaterThanOrEqual(1);
    expect(res.finalCode).toContain('missingConfigValue');
  });

  test('GitHub Client: Lists repos and triggers workflow dispatches', async () => {
    const gh = new GitHubClient();
    const repos = await gh.listRepositories();
    expect(repos.length).toBeGreaterThan(0);

    const dispatch = await gh.triggerWorkflowDispatch('Rusindu12', '1', 'build-apk.yml', 'arena/01a108ea-1');
    expect(dispatch.triggered).toBe(true);

    const runs = await gh.getWorkflowRuns('Rusindu12', '1', 'build-apk.yml');
    expect(runs.length).toBeGreaterThan(0);
  });

  test('REST API: Sandbox execution & GitHub workflow endpoints', async () => {
    // 1. Run code in sandbox via API
    const runRes = await request(app)
      .post('/api/v1/sandbox/run')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({
        language: 'javascript',
        code: 'console.log("REST API Sandbox OK");'
      });
    expect(runRes.status).toBe(200);
    expect(runRes.body.stdout).toContain('REST API Sandbox OK');

    // 2. Scaffold app
    const scaffoldRes = await request(app)
      .post('/api/v1/sandbox/scaffold')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({ type: 'react_native', name: 'TestMobileApp' });
    expect(scaffoldRes.status).toBe(200);
    expect(scaffoldRes.body.scaffold.type).toBe('react_native');

    // 3. Trigger GitHub APK build
    const apkRes = await request(app)
      .post('/api/v1/github/build-apk')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({ owner: 'Rusindu12', repo: '1' });
    expect(apkRes.status).toBe(200);
    expect(apkRes.body.triggered).toBe(true);
  });
});
