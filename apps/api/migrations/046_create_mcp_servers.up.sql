-- up
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  description TEXT,
  transport_type VARCHAR(20) NOT NULL DEFAULT 'http', -- 'http', 'sse'
  endpoint_url TEXT NOT NULL,
  auth_token_encrypted TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'connected', -- 'connected', 'offline', 'error'
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_servers_user_name ON mcp_servers(user_id, name);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_user_id ON mcp_servers(user_id);
