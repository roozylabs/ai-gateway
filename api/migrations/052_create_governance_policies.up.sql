-- up
CREATE TABLE IF NOT EXISTS governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'developer',
  effect VARCHAR(10) NOT NULL DEFAULT 'allow',
  agent_pattern VARCHAR(100) NOT NULL DEFAULT '*',
  model_pattern VARCHAR(100) NOT NULL DEFAULT '*',
  tool_pattern VARCHAR(100) NOT NULL DEFAULT '*',
  resource_pattern VARCHAR(100) NOT NULL DEFAULT '*',
  priority INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_governance_policies_user_name ON governance_policies(user_id, name);
CREATE INDEX IF NOT EXISTS idx_governance_policies_user_role ON governance_policies(user_id, role);
