-- up
CREATE TABLE IF NOT EXISTS mcp_server_invocations (
  id            BIGSERIAL PRIMARY KEY,
  user_id       VARCHAR(255) NOT NULL,
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name     TEXT NOT NULL,
  status_code   INT NOT NULL DEFAULT 0,
  is_error      BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  latency_ms    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcp_inv_server_created ON mcp_server_invocations(mcp_server_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_inv_user_created ON mcp_server_invocations(user_id, created_at DESC);

-- Row Level Security (mirrors 070_enable_pg_rls_policies pattern)
ALTER TABLE mcp_server_invocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcp_server_invocations_tenant_policy ON mcp_server_invocations;
CREATE POLICY mcp_server_invocations_tenant_policy ON mcp_server_invocations
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR mcp_server_id IN (
            SELECT id FROM mcp_servers
            WHERE user_id = current_setting('app.current_user_id', true)
               OR org_id = current_setting('app.current_org_id', true)
        )
    );
