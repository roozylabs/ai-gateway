-- Migration 077: Harden Authorization, RBAC Taxonomy, Workspace Members and Owner Safety

-- 1. Create workspace_members table with generated natural UUID
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'developer' CHECK (role IN ('admin', 'developer', 'operator', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_user ON workspace_members (workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON organization_members (org_id, user_id);

-- 2. Insert canonical <resource>:<action> permissions taxonomy
INSERT INTO permissions (id, code, resource, action, description) VALUES
-- Organization Management
(gen_random_uuid(), 'organization:read', 'organization', 'read', 'View organization profile, settings, and quotas'),
(gen_random_uuid(), 'organization:update', 'organization', 'update', 'Update organization details, metadata, and settings'),
(gen_random_uuid(), 'organization:delete', 'organization', 'delete', 'Delete organization and associated assets'),

-- Team Members
(gen_random_uuid(), 'member:read', 'member', 'read', 'List organization members and pending invitations'),
(gen_random_uuid(), 'member:invite', 'member', 'invite', 'Invite new team members to organization'),
(gen_random_uuid(), 'member:update', 'member', 'update', 'Change member roles and permissions'),
(gen_random_uuid(), 'member:remove', 'member', 'remove', 'Remove members from organization'),

-- Custom Roles
(gen_random_uuid(), 'role:read', 'role', 'read', 'View system and organization custom roles'),
(gen_random_uuid(), 'role:create', 'role', 'create', 'Create custom RBAC roles'),
(gen_random_uuid(), 'role:update', 'role', 'update', 'Update custom RBAC roles'),
(gen_random_uuid(), 'role:delete', 'role', 'delete', 'Delete custom RBAC roles'),

-- Workspaces & Projects
(gen_random_uuid(), 'workspace:read', 'workspace', 'read', 'View workspaces'),
(gen_random_uuid(), 'workspace:create', 'workspace', 'create', 'Create new workspaces'),
(gen_random_uuid(), 'workspace:update', 'workspace', 'update', 'Update workspace configuration'),
(gen_random_uuid(), 'workspace:delete', 'workspace', 'delete', 'Delete workspaces'),
(gen_random_uuid(), 'project:read', 'project', 'read', 'View workspace projects'),
(gen_random_uuid(), 'project:create', 'project', 'create', 'Create new projects'),
(gen_random_uuid(), 'project:update', 'project', 'update', 'Update project configuration'),
(gen_random_uuid(), 'project:delete', 'project', 'delete', 'Delete projects'),

-- Gateway API Keys
(gen_random_uuid(), 'api_key:read', 'api_key', 'read', 'List and view Gateway API Keys'),
(gen_random_uuid(), 'api_key:create', 'api_key', 'create', 'Provision new Gateway API Keys'),
(gen_random_uuid(), 'api_key:rotate', 'api_key', 'rotate', 'Rotate existing Gateway API Keys'),
(gen_random_uuid(), 'api_key:revoke', 'api_key', 'revoke', 'Revoke active Gateway API Keys'),

-- Provider Credentials
(gen_random_uuid(), 'credential:read', 'credential', 'read', 'List provider credentials in Vault'),
(gen_random_uuid(), 'credential:create', 'credential', 'create', 'Add provider credentials to Vault'),
(gen_random_uuid(), 'credential:update', 'credential', 'update', 'Update provider credentials'),
(gen_random_uuid(), 'credential:delete', 'credential', 'delete', 'Delete provider credentials from Vault'),

-- AI Models & Providers
(gen_random_uuid(), 'model:read', 'model', 'read', 'View AI models and routing configurations'),
(gen_random_uuid(), 'model:create', 'model', 'create', 'Create custom models and aliases'),
(gen_random_uuid(), 'model:update', 'model', 'update', 'Update model routing and capabilities'),
(gen_random_uuid(), 'model:delete', 'model', 'delete', 'Delete models'),

-- Autonomous Agents
(gen_random_uuid(), 'agent:read', 'agent', 'read', 'List and inspect AI agents'),
(gen_random_uuid(), 'agent:create', 'agent', 'create', 'Create new AI agent identities'),
(gen_random_uuid(), 'agent:update', 'agent', 'update', 'Update AI agent configuration and prompts'),
(gen_random_uuid(), 'agent:delete', 'agent', 'delete', 'Delete AI agents'),
(gen_random_uuid(), 'agent:execute', 'agent', 'execute', 'Execute AI agent inference and workflows'),

-- MCP Servers
(gen_random_uuid(), 'mcp:read', 'mcp', 'read', 'List connected MCP servers'),
(gen_random_uuid(), 'mcp:create', 'mcp', 'create', 'Connect and configure new MCP servers'),
(gen_random_uuid(), 'mcp:update', 'mcp', 'update', 'Update MCP server configurations'),
(gen_random_uuid(), 'mcp:delete', 'mcp', 'delete', 'Disconnect MCP servers'),
(gen_random_uuid(), 'mcp:execute', 'mcp', 'execute', 'Execute MCP tool invocations'),

-- Tools
(gen_random_uuid(), 'tool:read', 'tool', 'read', 'List available gateway tools'),
(gen_random_uuid(), 'tool:create', 'tool', 'create', 'Create gateway tools'),
(gen_random_uuid(), 'tool:update', 'tool', 'update', 'Update gateway tools'),
(gen_random_uuid(), 'tool:delete', 'tool', 'delete', 'Delete gateway tools'),
(gen_random_uuid(), 'tool:execute', 'tool', 'execute', 'Execute gateway tool tests'),

-- Resources
(gen_random_uuid(), 'resource:read', 'resource', 'read', 'List connected resources'),
(gen_random_uuid(), 'resource:create', 'resource', 'create', 'Create resources'),
(gen_random_uuid(), 'resource:update', 'resource', 'update', 'Update resources'),
(gen_random_uuid(), 'resource:delete', 'resource', 'delete', 'Delete resources'),
(gen_random_uuid(), 'resource:query', 'resource', 'query', 'Query resource backends'),

-- Governance & Policies
(gen_random_uuid(), 'governance:read', 'governance', 'read', 'View governance policies and RBAC rules'),
(gen_random_uuid(), 'governance:create', 'governance', 'create', 'Create governance policies'),
(gen_random_uuid(), 'governance:update', 'governance', 'update', 'Update governance policies'),
(gen_random_uuid(), 'governance:delete', 'governance', 'delete', 'Delete governance policies'),
(gen_random_uuid(), 'governance:evaluate', 'governance', 'evaluate', 'Evaluate governance rules'),

-- Budgets & Quotas
(gen_random_uuid(), 'budget:read', 'budget', 'read', 'View budget allocations and spend caps'),
(gen_random_uuid(), 'budget:create', 'budget', 'create', 'Create budget limits'),
(gen_random_uuid(), 'budget:update', 'budget', 'update', 'Update budget limits'),
(gen_random_uuid(), 'budget:delete', 'budget', 'delete', 'Delete budget limits'),
(gen_random_uuid(), 'quota:read', 'quota', 'read', 'View organization and workspace quotas'),
(gen_random_uuid(), 'quota:update', 'quota', 'update', 'Update tenant quotas and rate limits'),

-- Billing & Invoices
(gen_random_uuid(), 'billing:read', 'billing', 'read', 'View subscriptions, plans, and invoices'),
(gen_random_uuid(), 'billing:manage', 'billing', 'manage', 'Upgrade/downgrade subscription plans and payment methods'),

-- Audit Trail
(gen_random_uuid(), 'audit:read', 'audit', 'read', 'Inspect AI audit trail and request logs'),
(gen_random_uuid(), 'audit:export', 'audit', 'export', 'Export audit logs to CSV or JSON'),
(gen_random_uuid(), 'audit:verify', 'audit', 'verify', 'Verify cryptographic integrity of audit records')
ON CONFLICT (code) DO NOTHING;

-- 3. Link permissions to standard system roles using dynamic UUID resolution
-- Owner gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'owner' AND r.is_system = true
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Developer role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'developer' AND r.is_system = true
AND p.code IN (
    'organization:read', 'workspace:read', 'project:read',
    'api_key:read', 'api_key:create', 'api_key:rotate', 'api_key:revoke',
    'credential:read', 'credential:create', 'credential:update',
    'model:read', 'model:update',
    'agent:read', 'agent:create', 'agent:update', 'agent:execute',
    'mcp:read', 'mcp:create', 'mcp:update', 'mcp:execute',
    'tool:read', 'tool:create', 'tool:update', 'tool:execute',
    'resource:read', 'resource:create', 'resource:update', 'resource:query',
    'budget:read', 'quota:read', 'audit:read',
    'playground:execute', 'logs:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Agent manager role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'agent_manager' AND r.is_system = true
AND p.code IN (
    'organization:read', 'workspace:read', 'project:read',
    'agent:read', 'agent:create', 'agent:update', 'agent:delete', 'agent:execute',
    'mcp:read', 'mcp:create', 'mcp:update', 'mcp:execute',
    'tool:read', 'tool:create', 'tool:update', 'tool:execute',
    'governance:read', 'governance:evaluate', 'budget:read', 'audit:read',
    'playground:execute', 'logs:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- FinOps manager role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'finops_manager' AND r.is_system = true
AND p.code IN (
    'organization:read', 'workspace:read', 'project:read',
    'budget:read', 'budget:create', 'budget:update', 'budget:delete',
    'quota:read', 'quota:update',
    'billing:read', 'billing:manage', 'audit:read', 'audit:export',
    'logs:read', 'finops:read', 'finops:manage_budget'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Auditor role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'auditor' AND r.is_system = true
AND p.code IN (
    'organization:read', 'workspace:read', 'project:read',
    'governance:read', 'budget:read', 'quota:read',
    'audit:read', 'audit:export', 'audit:verify', 'logs:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'viewer' AND r.is_system = true
AND p.code IN (
    'organization:read', 'workspace:read', 'project:read',
    'model:read', 'agent:read', 'mcp:read', 'tool:read', 'resource:read',
    'budget:read', 'quota:read', 'logs:read', 'audit:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
