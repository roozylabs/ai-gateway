-- Migration 070 Down: Disable PostgreSQL Row Level Security (RLS) Policies

ALTER TABLE credentials DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credentials_tenant_policy ON credentials;

ALTER TABLE gateway_api_keys DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gateway_keys_tenant_policy ON gateway_api_keys;

ALTER TABLE mcp_servers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcp_servers_tenant_policy ON mcp_servers;

ALTER TABLE tools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tools_tenant_policy ON tools;

ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS resources_tenant_policy ON resources;

ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agents_tenant_policy ON agents;

ALTER TABLE governance_policies DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS governance_policies_tenant_policy ON governance_policies;

ALTER TABLE ai_audit_trails DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_audit_trails_tenant_policy ON ai_audit_trails;

ALTER TABLE request_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS request_logs_tenant_policy ON request_logs;
