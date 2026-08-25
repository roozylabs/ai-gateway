-- up
CREATE TABLE IF NOT EXISTS ai_audit_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  gateway_key_id VARCHAR(255),
  agent_id VARCHAR(255),
  agent_name VARCHAR(150),
  user_role VARCHAR(50) NOT NULL DEFAULT 'developer',
  model_slug VARCHAR(150) NOT NULL,
  failover_chain TEXT[],
  tools_invoked TEXT[],
  resources_accessed TEXT[],
  mcp_servers_called TEXT[],
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_cost_usd NUMERIC(12, 6) DEFAULT 0.0,
  status_code INT DEFAULT 200,
  latency_ms INT DEFAULT 0,
  ttft_ms INT DEFAULT 0,
  prompt_hash VARCHAR(64),
  response_hash VARCHAR(64),
  compliance_status VARCHAR(20) NOT NULL DEFAULT 'compliant',
  signature_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_trails_user_id ON ai_audit_trails(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_trails_agent_name ON ai_audit_trails(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_audit_trails_model_slug ON ai_audit_trails(model_slug);
CREATE INDEX IF NOT EXISTS idx_ai_audit_trails_compliance ON ai_audit_trails(compliance_status);
CREATE INDEX IF NOT EXISTS idx_ai_audit_trails_created_at ON ai_audit_trails(created_at DESC);
