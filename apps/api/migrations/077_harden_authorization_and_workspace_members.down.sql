-- Rollback Migration 077: Drop workspace_members and remove added permissions

DROP TABLE IF EXISTS workspace_members;

DELETE FROM permissions WHERE code IN (
    'organization:read', 'organization:update', 'organization:delete',
    'member:read', 'member:invite', 'member:update', 'member:remove',
    'role:read', 'role:create', 'role:update', 'role:delete',
    'workspace:read', 'workspace:create', 'workspace:update', 'workspace:delete',
    'project:read', 'project:create', 'project:update', 'project:delete',
    'api_key:read', 'api_key:create', 'api_key:rotate', 'api_key:revoke',
    'credential:read', 'credential:create', 'credential:update', 'credential:delete',
    'model:read', 'model:create', 'model:update', 'model:delete',
    'agent:read', 'agent:create', 'agent:update', 'agent:delete', 'agent:execute',
    'mcp:read', 'mcp:create', 'mcp:update', 'mcp:delete', 'mcp:execute',
    'tool:read', 'tool:create', 'tool:update', 'tool:delete', 'tool:execute',
    'resource:read', 'resource:create', 'resource:update', 'resource:delete', 'resource:query',
    'governance:read', 'governance:create', 'governance:update', 'governance:delete', 'governance:evaluate',
    'budget:read', 'budget:create', 'budget:update', 'budget:delete',
    'quota:read', 'quota:update',
    'billing:read', 'billing:manage',
    'audit:read', 'audit:export', 'audit:verify'
);
