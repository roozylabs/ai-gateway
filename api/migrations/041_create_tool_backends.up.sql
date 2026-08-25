-- up
CREATE TABLE tool_backends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  backend_type VARCHAR(20) NOT NULL DEFAULT 'http',
  endpoint_url TEXT NOT NULL,
  auth_token_encrypted TEXT,
  auth_header_name VARCHAR(100) DEFAULT 'Authorization',
  auth_header_prefix VARCHAR(50) DEFAULT 'Bearer ',
  timeout_ms INT NOT NULL DEFAULT 30000,
  priority INT NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tool_backends_tool_id ON tool_backends(tool_id);

-- down
DROP TABLE tool_backends;
