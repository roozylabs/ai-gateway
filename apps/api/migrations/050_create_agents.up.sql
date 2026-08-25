-- up
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  description TEXT,
  agent_type VARCHAR(50) NOT NULL DEFAULT 'general',
  system_prompt_override TEXT,
  allowed_models TEXT[],
  allowed_tools TEXT[],
  allowed_resources TEXT[],
  max_budget_cents INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_user_name ON agents(user_id, name);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
