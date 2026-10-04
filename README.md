# 🧠 AI Brain (කෘත්‍රිම බුද්ධි මොළය)
### Universal Sinhala + English AI Agent · Delivered as Android APK & Web · Backed by Huge Shared Cloud Memory

[![Build AI Brain Android APK](https://github.com/Rusindu12/1/actions/workflows/build-apk.yml/badge.svg)](https://github.com/Rusindu12/1/actions/workflows/build-apk.yml)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![pgvector](https://img.shields.io/badge/Postgres-pgvector-blueviolet.svg)](https://github.com/pgvector/pgvector)
[![Android](https://img.shields.io/badge/Android-APK%20(API%2026+)--34-brightgreen.svg)](https://developer.android.com/)

---

## 📖 Overview / හැඳින්වීම

**AI Brain** is a bilingual (Sinhala + English) autonomous cognitive agent. It operates everywhere the user is: on Android across any app via a floating bubble, accessibility service, share sheet, and text selection; on the web via a responsive dashboard; and across any website via a Chrome/Firefox WebExtension.

All clients share **one unified cloud memory ("Brain Server")** accessible via a single Account Key. Offline caching and auto-sync ensure zero data loss.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNIVERSAL CLIENT LAYER                          │
├──────────────────┬───────────────────┬───────────────────┬─────────────┤
│   Android APK    │  Web App / Portal │ Browser Extension │  Third-Party│
│ (Bubble, Select, │ (Interactive Next │  (Chrome/Firefox  │     Apps    │
│  Accessibility,  │    Dashboard)     │    Manifest V3)   │(@aibrain/sdk│
│   Share Sheet)   │                   │                   │  REST API)  │
└────────┬─────────┴─────────┬─────────┴─────────┬─────────┴──────┬──────┘
         │                   │                   │                │
         ▼                   ▼                   ▼                ▼
┌────────────────────────────────────────────────────────────────────────┐
│              AI BRAIN SERVER (Node.js + TypeScript REST/WS)             │
├────────────────────────────────────────────────────────────────────────┤
│ • Bilingual Engine (Sinhala Unicode, Singlish Transliteration, Detector│
│ • Voice Interface (si-LK / en-US Speech-to-Text & Text-to-Speech)      │
│ • Multilingual Embedder (384-dim normalized vector embeddings)         │
│ • Autonomous Agent Loop (Plan ➔ Tool ➔ Verify ➔ Report ➔ Auto-Retry)  │
│ • Coding Sandbox & App Scaffolder (Node.js, Python, React Native, APK) │
│ • Prompt-Injection Defense (<untrusted_content> XML isolation wrappers)│
│ • Risk Guard (Requires interactive confirmation for deletions & pushes)│
│ • GitHub OAuth Manager (AES-256-GCM encrypted tokens)                  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
┌──────────────────────────────────────┐    ┌───────────────────────────────────┐
│     HUGE SHARED MEMORY ENGINE        │    │   CONTINUOUS INTERNET LEARNING    │
│   (Postgres + pgvector / Redis)      │    │         BACKGROUND WORKER         │
├──────────────────────────────────────┤    ├───────────────────────────────────┤
│ 1. Chat: Short-term rolling context  │    │ • Automated topic discovery       │
│ 2. Facts: Long-term declarative data │    │ • Robots.txt & rate-limited fetch │
│ 3. Tasks: Execution & tool logs      │    │ • Cleaning, chunking & embedding  │
│ 4. Knowledge: Verified learning      │    │ • Multi-source cross-verification │
│ • Auto-summarization & deduplication │    │ • Interactive "Learning Feed"     │
│ • Importance scoring & JSON/MD export│    │ • RAG enhancement (No retraining) │
└──────────────────────────────────────┘    └───────────────────────────────────┘
```

---

## ✨ Core Features

### 1. 📱 Universal Android Access
- **Floating Bubble Overlay (`BrainBubbleService`):** Accessible via `SYSTEM_ALERT_WINDOW` floating on top of any active application. Single tap opens quick bilingual voice/text prompt.
- **Accessibility Service (`BrainAccessibilityService`):** Inspects foreground view hierarchy text to assist inside other apps with explicit user consent and a persistent visible notification indicator.
- **Text-Selection Action (`BrainProcessTextActivity`):** Select text anywhere in Android (`PROCESS_TEXT`) to instantly explain or translate in Sinhala or English.
- **Share-Sheet Target (`BrainShareTargetActivity`):** Ingests links, articles, or notes directly from Chrome, WhatsApp, and social media via `ACTION_SEND`.
- **Default Assistant (`BrainVoiceInteractionService`):** System-wide assist triggered by holding the home button.

### 2. 🇱🇰 Sinhala + English Bilingual Engine
- **Accurate Script Detection:** Differentiates between Sinhala Unicode (`0x0D80-0x0DFF`), Singlish (Romanized Sinhala, e.g. *"kohomada oyaata"*, *"mata meka karanna puluwanda"*), English, and source code.
- **Singlish Phonetic Transliteration:** Automatically converts romanized Sinhala phrases to standard Unicode Sinhala.
- **Voice STT / TTS:** Configured for Sinhala (`si-LK`) and English (`en-US`) voice recognition and synthesis.
- **Sinhala Unicode Normalization:** Handles complex ligatures (*bandi akuru* ක්‍ෂ, ත්‍ර, ර්‍ය), *hal lakuna*, and *kombuva* ordering.

### 3. 🧠 Huge Shared Memory ("Brain Server")
- **4 Tiers of Memory:**
  1. `chat`: Short-term context and conversation history.
  2. `facts`: Long-term user preferences, declarative knowledge, credentials.
  3. `tasks`: Execution history, plans, tool outputs, and verification checkpoints.
  4. `knowledge`: Verified web-crawled insights with domain sources and confidence scores.
- **Vector Search & Deduplication:** Cosine similarity threshold (>= 0.88) automatically updates and reinforces existing facts instead of duplicating entries.
- **Importance Scoring:** Algorithmic importance evaluation (0.0 to 1.0) based on sentiment, preference markers, and novelty.
- **Dashboard & Export:** Full web dashboard to browse, filter, edit, delete, and export memory as JSON or Markdown.

### 4. 🌐 Continuous Internet Learning
- Background crawler identifies user interests and task history topics.
- Respects `robots.txt` and domain rate limits; saves summaries and links, not full copies.
- Cross-checks across 2+ independent domains to corroborate facts and flag outdated information.
- **Learning Feed:** Dedicated UI screen to review, approve, or reject candidate insights before memory integration.
- Strictly enhances via RAG, eliminating catastrophic forgetting and unauthorized weight retraining.

### 5. 💻 Coding Agent & Safe Sandbox
- Isolated execution of JavaScript, TypeScript, Python, and Shell code with strict memory/timeout limits.
- Full multi-file application scaffolding for **React Native**, **Next.js**, **Node/Express**, and **Android Kotlin**.
- **Self-Debugging Loop:** Detects syntax, reference, and runtime errors, formulates heuristic patches, and re-executes up to 3 times until passing.
- **Automated GitHub Actions APK Builder:** Triggers `.github/workflows/build-apk.yml` to compile and sign Android APK releases.

### 6. 🛡️ Security & Prompt-Injection Defense
- **Prompt Injection Defense:** External search snippets and web pages are sanitized and sealed in `<untrusted_content>` XML boundaries to prevent prompt override attacks.
- **Risk Guard:** Destructive file operations, payments, and direct pushes to `main` git branches require interactive confirmation tokens.
- **Token Encryption:** AES-256-GCM encryption for all stored GitHub OAuth tokens and account secrets.
- **Emergency Kill Switch:** One-click kill switch instantly revokes all API tokens and suspends background jobs.

---

## 🗄️ Database Schema (PostgreSQL + pgvector)

```sql
-- Huge Shared Memory
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  tier VARCHAR(32) NOT NULL CHECK (tier IN ('chat', 'facts', 'tasks', 'knowledge')),
  content TEXT NOT NULL,
  summary TEXT,
  embedding vector(384),
  importance_score NUMERIC(4, 3) DEFAULT 0.500,
  source_type VARCHAR(64) DEFAULT 'chat',
  source_url TEXT,
  language VARCHAR(16) DEFAULT 'en',
  confidence NUMERIC(4, 3) DEFAULT 1.000,
  is_archived BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT TRUE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_memories_embedding_hnsw 
ON memories USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

---

## 🔌 Public REST API & SDK

### Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health, supported languages, memory tiers |
| `POST` | `/api/v1/chat` | Bilingual chat with auto-detect, Singlish support, RAG memory |
| `POST` | `/api/v1/chat/detect-language` | Linguistic analysis (Sinhala/Singlish/English/Code) |
| `POST` | `/api/v1/chat/transliterate` | Singlish to Sinhala Unicode converter |
| `GET` | `/api/v1/memories` | Vector similarity search across 4 memory tiers |
| `POST` | `/api/v1/memories` | Store memory entry with automatic deduplication |
| `PUT` | `/api/v1/memories/:id` | Update memory content / importance |
| `DELETE` | `/api/v1/memories/:id` | Permanently delete memory entry |
| `GET` | `/api/v1/memories/export` | Export memory archive as JSON or Markdown |
| `GET` | `/api/v1/tasks` | List task execution queue and live step progress |
| `POST` | `/api/v1/tasks` | Create task and launch autonomous agent loop |
| `POST` | `/api/v1/tasks/:id/confirm` | Approve/reject risky task step |
| `POST` | `/api/v1/sandbox/run` | Execute code safely in isolated sandbox |
| `POST` | `/api/v1/sandbox/scaffold` | Scaffold React Native / Next.js / Android app |
| `POST` | `/api/v1/sandbox/debug` | Autonomous self-debugging execution loop |
| `GET` | `/api/v1/learning/feed` | List candidate insights from continuous crawler |
| `POST` | `/api/v1/learning/approve/:id` | Approve insight to promote to shared memory |
| `POST` | `/api/v1/learning/reject/:id` | Reject candidate insight |
| `POST` | `/api/v1/auth/kill-switch` | Emergency kill switch toggle |
| `GET` | `/api/v1/apk/download` | Direct APK download link |

### Using `@aibrain/sdk` (Node / Web / Mobile)
```typescript
import { AIBrainClient } from '@aibrain/sdk';

const brain = new AIBrainClient({
  apiKey: 'brain_key_master_sinhala_english_universal_access',
  baseUrl: 'http://localhost:3000'
});

// 1. Bilingual Chat
const response = await brain.chat('kohomada oyaata');
console.log(response.reply); // Responds in Sinhala!

// 2. Memory Search
const memories = await brain.memories.search('TypeScript full-stack');

// 3. Autonomous Task
const task = await brain.tasks.create('Research Sinhala NLP and summarize');
```

---

## 🚀 Quick Start & Development

### 1. Local Run
```bash
# 1. Install & Build Brain Server
cd brain-server
npm install
npm run build

# 2. Run Tests (All 5 Phases)
npm test

# 3. Start Server & Live Dashboard
npm start
# Visit http://localhost:3000 in your browser
```

### 2. Docker Compose (Full Stack with Postgres pgvector + Redis)
```bash
docker-compose up --build -d
```

### 3. Android APK Build (via Gradle / GitHub Actions)
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🇱🇰 සිංහල මාර්ගෝපදේශය (Sinhala Guide)

1. **Android App:** Floating Bubble එක මඟින් ඔබගේ දුරකථනයේ WhatsApp, Browser හෝ ඕනෑම app එකක් මත සිට එක tap එකකින් AI Brain විවෘත වේ.
2. **Singlish සහය:** *"kohomada"*, *"mata meka hadala denna"*, *"subha udasanak"* ආදී ඕනෑම Singlish වාක්‍යයක් ස්වයංක්‍රීයව හඳුනාගෙන නිවැරදි සිංහලෙන් පිළිතුරු සපයයි.
3. **ඒකාබද්ධ මතකය:** Android app එකෙන්, Web එකෙන්, හෝ Extension එකෙන් ඔබ කරන ඕනෑම සාකච්ඡාවක් එක් cloud මතකයක (Shared Memory) සුරක්ෂිත වේ.
4. **අන්තර්ජාලයෙන් ඉගෙනීම:** Background worker මඟින් අන්තර්ජාලයෙන් උගන්නා නව කරුණු 'Learning Feed' එකෙන් බලා ඔබට අවශ්‍ය නම් පමණක් Brain එකට එකතු (Approve) කළ හැක.

---

## 📜 License
MIT License. Engineered for open and secure multilingual AI systems.
