-- down
DROP POLICY IF EXISTS mcp_server_invocations_tenant_policy ON mcp_server_invocations;
ALTER TABLE mcp_server_invocations DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS mcp_server_invocations;
