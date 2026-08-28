-- Migration 070: Enable PostgreSQL Row Level Security (RLS) Policies across Multi-Tenant Tables

-- 1. Credentials
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credentials_tenant_policy ON credentials;
CREATE POLICY credentials_tenant_policy ON credentials
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR provider_id IN (
            SELECT id FROM providers 
            WHERE user_id = current_setting('app.current_user_id', true)
               OR org_id = current_setting('app.current_org_id', true)
        )
    );

-- 2. Gateway API Keys
ALTER TABLE gateway_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gateway_keys_tenant_policy ON gateway_api_keys;
CREATE POLICY gateway_keys_tenant_policy ON gateway_api_keys
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );

-- 3. MCP Servers
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcp_servers_tenant_policy ON mcp_servers;
CREATE POLICY mcp_servers_tenant_policy ON mcp_servers
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );

-- 4. Tools
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tools_tenant_policy ON tools;
CREATE POLICY tools_tenant_policy ON tools
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );

-- 5. Resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS resources_tenant_policy ON resources;
CREATE POLICY resources_tenant_policy ON resources
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );

-- 6. Agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agents_tenant_policy ON agents;
CREATE POLICY agents_tenant_policy ON agents
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );

-- 7. Governance Policies
ALTER TABLE governance_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS governance_policies_tenant_policy ON governance_policies;
CREATE POLICY governance_policies_tenant_policy ON governance_policies
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );

-- 8. AI Audit Trails
ALTER TABLE ai_audit_trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_audit_trails_tenant_policy ON ai_audit_trails;
CREATE POLICY ai_audit_trails_tenant_policy ON ai_audit_trails
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );

-- 9. Request Logs
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS request_logs_tenant_policy ON request_logs;
CREATE POLICY request_logs_tenant_policy ON request_logs
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );
