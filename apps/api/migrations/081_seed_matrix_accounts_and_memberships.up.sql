-- Migration 081: Seed Matrix Accounts, Organization Memberships, and Workspace Memberships
-- Fixes LIKE filter bug ('%.prism.local' -> '%@prism.local') for matrix users

-- 1. Ensure/Expand CHECK constraints on organization_members and workspace_members
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check 
    CHECK (role IN ('owner', 'admin', 'developer', 'billing_manager', 'agent_manager', 'finops_manager', 'auditor', 'viewer'));

ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
    CHECK (role IN ('owner', 'admin', 'developer', 'operator', 'agent_manager', 'finops_manager', 'auditor', 'viewer'));

-- 2. Clean and Seed Account Records with Verified bcrypt Hash for PrismMatrix_7x9k2m4p!
DELETE FROM account WHERE account_id LIKE '%@prism.local';

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    u.email,
    'credential',
    u.id,
    '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46',
    NOW(),
    NOW()
FROM "user" u
WHERE u.email LIKE '%@prism.local';

-- 3. Seed Organization Memberships
INSERT INTO organization_members (id, org_id, user_id, role, role_id, created_at, updated_at)
SELECT 
    gen_random_uuid()::text,
    u.org_id,
    u.id,
    u.primary_role,
    r.id,
    NOW(),
    NOW()
FROM "user" u
JOIN roles r ON r.slug = u.primary_role AND r.is_system = true
WHERE u.email LIKE '%@prism.local'
ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    role_id = EXCLUDED.role_id,
    updated_at = NOW();

-- 4. Seed Engineering Workspace Memberships (owner, developer, agent_manager, auditor, viewer)
INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
SELECT 
    w.id,
    u.id,
    u.primary_role,
    NOW(),
    NOW()
FROM "user" u
JOIN workspaces w ON w.org_id = u.org_id AND w.slug LIKE '%-eng'
WHERE u.email LIKE '%@prism.local' AND u.primary_role IN ('owner', 'developer', 'agent_manager', 'auditor', 'viewer')
ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- 5. Seed Finance Workspace Memberships (finops_manager)
INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
SELECT 
    w.id,
    u.id,
    u.primary_role,
    NOW(),
    NOW()
FROM "user" u
JOIN workspaces w ON w.org_id = u.org_id AND w.slug LIKE '%-finance'
WHERE u.email LIKE '%@prism.local' AND u.primary_role = 'finops_manager'
ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();
