-- ============================================================================
-- AI Brain Database Schema (PostgreSQL 15+ with pgvector)
-- Supports millions of entries across 4 memory tiers with vector search & archiving
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Accounts & API Keys (One Account Key accesses APK, Web, Extensions & Third-party)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_key VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(32) DEFAULT 'user',
  kill_switch_enabled BOOLEAN DEFAULT FALSE,
  cost_limit_usd NUMERIC(10, 4) DEFAULT 50.00,
  current_usage_usd NUMERIC(10, 4) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  key_hash VARCHAR(128) UNIQUE NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  label VARCHAR(128) NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['chat', 'memory_read', 'memory_write', 'tasks', 'coding', 'github'],
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Huge Shared Memory Table (4 tiers: chat, facts, tasks, knowledge)
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  tier VARCHAR(32) NOT NULL CHECK (tier IN ('chat', 'facts', 'tasks', 'knowledge')),
  content TEXT NOT NULL,
  summary TEXT,
  embedding vector(384),
  importance_score NUMERIC(4, 3) DEFAULT 0.500 CHECK (importance_score >= 0 AND importance_score <= 1),
  source_type VARCHAR(64) DEFAULT 'chat', -- 'chat', 'android_accessibility', 'web_extension', 'crawler', 'task'
  source_url TEXT,
  source_context TEXT,
  language VARCHAR(16) DEFAULT 'en', -- 'si', 'singlish', 'en', 'mixed'
  confidence NUMERIC(4, 3) DEFAULT 1.000,
  is_archived BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT TRUE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast HNSW Vector Index for Million-Scale Similarity Search
CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw 
ON memories USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_memories_account_tier ON memories(account_id, tier, is_archived);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);

-- Task Execution Queue & Audit Logs
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  plan JSONB,
  status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused_confirmation', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  live_steps JSONB DEFAULT '[]'::jsonb,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  confirmation_payload JSONB,
  confirmation_token VARCHAR(64),
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Continuous Internet Learning Feed & Approval
CREATE TABLE IF NOT EXISTS learning_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_domain VARCHAR(255) NOT NULL,
  extracted_summary TEXT NOT NULL,
  raw_chunk TEXT NOT NULL,
  confidence NUMERIC(4, 3) DEFAULT 0.800,
  cross_check_count INTEGER DEFAULT 1,
  cross_check_sources TEXT[],
  status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GitHub Encrypted Tokens & Repositories
CREATE TABLE IF NOT EXISTS github_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  github_username VARCHAR(128) NOT NULL,
  encrypted_token TEXT NOT NULL,
  token_iv VARCHAR(64) NOT NULL,
  token_auth_tag VARCHAR(64) NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['repo', 'workflow'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log for Security & Tracing
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  client_type VARCHAR(64) NOT NULL, -- 'android_apk', 'web_dashboard', 'browser_extension', 'api'
  action VARCHAR(128) NOT NULL,
  tool_name VARCHAR(128),
  ip_address VARCHAR(45),
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
