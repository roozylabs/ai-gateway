-- Rollback Migration 078

ALTER TABLE organization_members ALTER COLUMN role_id DROP NOT NULL;
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_org_members_role_id;
DELETE FROM permissions WHERE code IN ('workspace:admin', 'playground:execute', 'logs:read', 'finops:read', 'finops:manage_budget');
