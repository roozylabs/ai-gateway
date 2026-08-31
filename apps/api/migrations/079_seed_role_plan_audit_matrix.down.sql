-- Rollback Migration 079

DELETE FROM workspace_members WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%.prism.local');
DELETE FROM organization_members WHERE org_id IN (SELECT id FROM organizations WHERE slug LIKE 'org-matrix-%');
DELETE FROM account WHERE account_id LIKE '%.prism.local';
DELETE FROM "user" WHERE email LIKE '%.prism.local';
DELETE FROM tenant_quotas WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE 'org-matrix-%');
DELETE FROM projects WHERE workspace_id IN (SELECT id FROM workspaces WHERE slug IN ('ws-free-eng', 'ws-free-finance', 'ws-pro-eng', 'ws-pro-finance', 'ws-team-eng', 'ws-team-finance', 'ws-enterprise-eng', 'ws-enterprise-finance'));
DELETE FROM workspaces WHERE org_id IN (SELECT id FROM organizations WHERE slug LIKE 'org-matrix-%');
DELETE FROM organizations WHERE slug IN ('org-matrix-free', 'org-matrix-pro', 'org-matrix-team', 'org-matrix-enterprise');

-- Restore original CHECK constraints
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check 
    CHECK (role IN ('owner', 'admin', 'developer', 'billing_manager', 'auditor'));

ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
    CHECK (role IN ('admin', 'developer', 'operator', 'viewer'));
