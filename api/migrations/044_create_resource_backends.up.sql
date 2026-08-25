-- up
CREATE TABLE IF NOT EXISTS resource_backends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  backend_type VARCHAR(20) NOT NULL,
  endpoint_url TEXT,
  http_method VARCHAR(10) DEFAULT 'POST',
  auth_token_encrypted TEXT,
  auth_header_name VARCHAR(100) DEFAULT 'Authorization',
  auth_header_prefix VARCHAR(50) DEFAULT 'Bearer ',
  query_template TEXT,
  connection_string_encrypted TEXT,
  sql_query TEXT,
  param_names TEXT[],
  timeout_ms INT NOT NULL DEFAULT 30000,
  priority INT NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resource_backends_resource_id ON resource_backends(resource_id);

-- down
DROP TABLE IF EXISTS resource_backends;
