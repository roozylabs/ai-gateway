-- Migration 078: Normalize role_id in organization_members, Add workspace:admin and Canonical Permissions

-- 1. Backfill role_id from role string for rows missing role_id
UPDATE organization_members om
SET role_id = r.id
FROM roles r
WHERE om.role = r.slug
  AND r.is_system = true
  AND om.role_id IS NULL;

-- 2. Make role_id NOT NULL after backfill
ALTER TABLE organization_members
  ALTER COLUMN role_id SET NOT NULL;

-- 3. Add FK constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_org_members_role_id'
  ) THEN
    ALTER TABLE organization_members
      ADD CONSTRAINT fk_org_members_role_id
      FOREIGN KEY (role_id) REFERENCES roles(id);
  END IF;
END $$;

-- 4. Add workspace:admin to canonical permissions (for cross-workspace administrative override)
INSERT INTO permissions (id, code, resource, action, description) VALUES
(gen_random_uuid(), 'workspace:admin', 'workspace', 'admin', 'Administrative access to all workspaces in the organization'),
(gen_random_uuid(), 'playground:execute', 'playground', 'execute', 'Execute inference via AI Playground'),
(gen_random_uuid(), 'logs:read', 'logs', 'read', 'View request logs and streaming traces'),
(gen_random_uuid(), 'finops:read', 'finops', 'read', 'View FinOps dashboards and cost analytics'),
(gen_random_uuid(), 'finops:manage_budget', 'finops', 'manage_budget', 'Manage FinOps budget allocations')
ON CONFLICT (code) DO NOTHING;

-- 5. Grant workspace:admin, playground, logs, and finops to owner role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'owner' AND r.is_system = true
  AND p.code IN ('workspace:admin', 'playground:execute', 'logs:read', 'finops:read', 'finops:manage_budget')
ON CONFLICT (role_id, permission_id) DO NOTHING;
