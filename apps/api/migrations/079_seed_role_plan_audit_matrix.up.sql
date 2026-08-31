-- Migration 079: Multi-Role & Multi-Plan Matrix Seeder (24 Identities across 4 Plan Tiers & 6 RBAC Roles with Natural Generated UUIDs)

-- 1. Relax/Expand CHECK constraints on organization_members.role and workspace_members.role
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check 
    CHECK (role IN ('owner', 'admin', 'developer', 'billing_manager', 'agent_manager', 'finops_manager', 'auditor', 'viewer'));

ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
    CHECK (role IN ('owner', 'admin', 'developer', 'operator', 'agent_manager', 'finops_manager', 'auditor', 'viewer'));

-- 2. Seed 4 Matrix Organizations using gen_random_uuid()
INSERT INTO organizations (id, name, slug, plan_tier, max_workspaces, max_projects_per_workspace, created_at, updated_at) VALUES
(gen_random_uuid()::text, 'Matrix Labs Free', 'org-matrix-free', 'free', 1, 2, NOW(), NOW()),
(gen_random_uuid()::text, 'Matrix Labs Pro', 'org-matrix-pro', 'pro', 3, 5, NOW(), NOW()),
(gen_random_uuid()::text, 'Matrix Labs Team', 'org-matrix-team', 'team', 10, 10, NOW(), NOW()),
(gen_random_uuid()::text, 'Matrix Labs Enterprise', 'org-matrix-enterprise', 'enterprise', 50, 50, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    plan_tier = EXCLUDED.plan_tier,
    max_workspaces = EXCLUDED.max_workspaces,
    max_projects_per_workspace = EXCLUDED.max_projects_per_workspace,
    updated_at = NOW();

-- 3. Seed 8 Workspaces (2 per Organization) using gen_random_uuid()
INSERT INTO workspaces (id, org_id, name, slug, created_at, updated_at) VALUES
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), 'Free Tier Engineering', 'ws-free-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), 'Free Tier Finance & Ops', 'ws-free-finance', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), 'Pro Developer Engineering', 'ws-pro-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), 'Pro Developer Finance & Ops', 'ws-pro-finance', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), 'Team Engineering Core', 'ws-team-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), 'Team Finance & Ops', 'ws-team-finance', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), 'Enterprise AI Infrastructure', 'ws-enterprise-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), 'Enterprise FinOps & Compliance', 'ws-enterprise-finance', NOW(), NOW())
ON CONFLICT (org_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- 4. Seed 8 Projects using gen_random_uuid()
INSERT INTO projects (id, workspace_id, name, slug, created_at, updated_at) VALUES
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-free-eng'), 'Free AI Core', 'proj-free-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-free-finance'), 'Free Billing', 'proj-free-finance', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-pro-eng'), 'Pro AI Core', 'proj-pro-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-pro-finance'), 'Pro Billing', 'proj-pro-finance', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-team-eng'), 'Team AI Core', 'proj-team-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-team-finance'), 'Team Billing', 'proj-team-finance', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-enterprise-eng'), 'Enterprise AI Core', 'proj-enterprise-eng', NOW(), NOW()),
(gen_random_uuid()::text, (SELECT id FROM workspaces WHERE slug = 'ws-enterprise-finance'), 'Enterprise Billing', 'proj-enterprise-finance', NOW(), NOW())
ON CONFLICT (workspace_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- 5. Seed Organization Quotas
INSERT INTO tenant_quotas (organization_id, target_type, target_id, monthly_spend_limit_usd, daily_spend_limit_usd, daily_request_limit, max_concurrent_streams, created_at, updated_at)
SELECT id, 'organization', id, 50.00, 5.00, 10000, 5, NOW(), NOW() FROM organizations WHERE slug = 'org-matrix-free'
ON CONFLICT (target_type, target_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
    daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
    daily_request_limit = EXCLUDED.daily_request_limit,
    max_concurrent_streams = EXCLUDED.max_concurrent_streams,
    updated_at = NOW();

INSERT INTO tenant_quotas (organization_id, target_type, target_id, monthly_spend_limit_usd, daily_spend_limit_usd, daily_request_limit, max_concurrent_streams, created_at, updated_at)
SELECT id, 'organization', id, 300.00, 30.00, 50000, 20, NOW(), NOW() FROM organizations WHERE slug = 'org-matrix-pro'
ON CONFLICT (target_type, target_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
    daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
    daily_request_limit = EXCLUDED.daily_request_limit,
    max_concurrent_streams = EXCLUDED.max_concurrent_streams,
    updated_at = NOW();

INSERT INTO tenant_quotas (organization_id, target_type, target_id, monthly_spend_limit_usd, daily_spend_limit_usd, daily_request_limit, max_concurrent_streams, created_at, updated_at)
SELECT id, 'organization', id, 1500.00, 150.00, 250000, 50, NOW(), NOW() FROM organizations WHERE slug = 'org-matrix-team'
ON CONFLICT (target_type, target_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
    daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
    daily_request_limit = EXCLUDED.daily_request_limit,
    max_concurrent_streams = EXCLUDED.max_concurrent_streams,
    updated_at = NOW();

INSERT INTO tenant_quotas (organization_id, target_type, target_id, monthly_spend_limit_usd, daily_spend_limit_usd, daily_request_limit, max_concurrent_streams, created_at, updated_at)
SELECT id, 'organization', id, 5000.00, 500.00, 1000000, 200, NOW(), NOW() FROM organizations WHERE slug = 'org-matrix-enterprise'
ON CONFLICT (target_type, target_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
    daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
    daily_request_limit = EXCLUDED.daily_request_limit,
    max_concurrent_streams = EXCLUDED.max_concurrent_streams,
    updated_at = NOW();

-- 6. Seed 24 Matrix Users using gen_random_uuid()
INSERT INTO "user" (id, name, email, email_verified, is_onboarded, primary_role, auth_provider, org_id, created_at, updated_at) VALUES
-- Free Tier Users
(gen_random_uuid()::text, 'Owner (Free Tier)', 'owner.free@prism.local', true, true, 'owner', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), NOW(), NOW()),
(gen_random_uuid()::text, 'Developer (Free Tier)', 'dev.free@prism.local', true, true, 'developer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), NOW(), NOW()),
(gen_random_uuid()::text, 'Agent Manager (Free Tier)', 'agent.free@prism.local', true, true, 'agent_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), NOW(), NOW()),
(gen_random_uuid()::text, 'FinOps Manager (Free Tier)', 'finops.free@prism.local', true, true, 'finops_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), NOW(), NOW()),
(gen_random_uuid()::text, 'Auditor (Free Tier)', 'auditor.free@prism.local', true, true, 'auditor', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), NOW(), NOW()),
(gen_random_uuid()::text, 'Viewer (Free Tier)', 'viewer.free@prism.local', true, true, 'viewer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-free'), NOW(), NOW()),

-- Pro Tier Users
(gen_random_uuid()::text, 'Owner (Pro Tier)', 'owner.pro@prism.local', true, true, 'owner', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), NOW(), NOW()),
(gen_random_uuid()::text, 'Developer (Pro Tier)', 'dev.pro@prism.local', true, true, 'developer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), NOW(), NOW()),
(gen_random_uuid()::text, 'Agent Manager (Pro Tier)', 'agent.pro@prism.local', true, true, 'agent_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), NOW(), NOW()),
(gen_random_uuid()::text, 'FinOps Manager (Pro Tier)', 'finops.pro@prism.local', true, true, 'finops_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), NOW(), NOW()),
(gen_random_uuid()::text, 'Auditor (Pro Tier)', 'auditor.pro@prism.local', true, true, 'auditor', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), NOW(), NOW()),
(gen_random_uuid()::text, 'Viewer (Pro Tier)', 'viewer.pro@prism.local', true, true, 'viewer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-pro'), NOW(), NOW()),

-- Team Tier Users
(gen_random_uuid()::text, 'Owner (Team Tier)', 'owner.team@prism.local', true, true, 'owner', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), NOW(), NOW()),
(gen_random_uuid()::text, 'Developer (Team Tier)', 'dev.team@prism.local', true, true, 'developer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), NOW(), NOW()),
(gen_random_uuid()::text, 'Agent Manager (Team Tier)', 'agent.team@prism.local', true, true, 'agent_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), NOW(), NOW()),
(gen_random_uuid()::text, 'FinOps Manager (Team Tier)', 'finops.team@prism.local', true, true, 'finops_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), NOW(), NOW()),
(gen_random_uuid()::text, 'Auditor (Team Tier)', 'auditor.team@prism.local', true, true, 'auditor', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), NOW(), NOW()),
(gen_random_uuid()::text, 'Viewer (Team Tier)', 'viewer.team@prism.local', true, true, 'viewer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-team'), NOW(), NOW()),

-- Enterprise Tier Users
(gen_random_uuid()::text, 'Owner (Enterprise Tier)', 'owner.enterprise@prism.local', true, true, 'owner', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), NOW(), NOW()),
(gen_random_uuid()::text, 'Developer (Enterprise Tier)', 'dev.enterprise@prism.local', true, true, 'developer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), NOW(), NOW()),
(gen_random_uuid()::text, 'Agent Manager (Enterprise Tier)', 'agent.enterprise@prism.local', true, true, 'agent_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), NOW(), NOW()),
(gen_random_uuid()::text, 'FinOps Manager (Enterprise Tier)', 'finops.enterprise@prism.local', true, true, 'finops_manager', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), NOW(), NOW()),
(gen_random_uuid()::text, 'Auditor (Enterprise Tier)', 'auditor.enterprise@prism.local', true, true, 'auditor', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), NOW(), NOW()),
(gen_random_uuid()::text, 'Viewer (Enterprise Tier)', 'viewer.enterprise@prism.local', true, true, 'viewer', 'credential', (SELECT id FROM organizations WHERE slug = 'org-matrix-enterprise'), NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    org_id = EXCLUDED.org_id,
    primary_role = EXCLUDED.primary_role,
    is_onboarded = true,
    updated_at = NOW();

-- 7. Clean and Seed Account Records (Verified bcrypt hash for PrismMatrix_7x9k2m4p!)
DELETE FROM account WHERE account_id LIKE '%.prism.local';

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT gen_random_uuid()::text, u.email, 'credential', u.id, '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()
FROM "user" u
WHERE u.email LIKE '%.prism.local';

-- 8. Seed Organization Memberships using gen_random_uuid()
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
WHERE u.email LIKE '%.prism.local'
ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    role_id = EXCLUDED.role_id,
    updated_at = NOW();

-- 9. Seed Workspace Memberships (Omit ID so PostgreSQL uses gen_random_uuid())
-- Engineering workspace members: owner, developer, agent_manager, auditor, viewer
INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
SELECT 
    w.id,
    u.id,
    u.primary_role,
    NOW(),
    NOW()
FROM "user" u
JOIN workspaces w ON w.org_id = u.org_id AND w.slug LIKE '%-eng'
WHERE u.email LIKE '%.prism.local' AND u.primary_role IN ('owner', 'developer', 'agent_manager', 'auditor', 'viewer')
ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- Finance workspace members: finops_manager
INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at)
SELECT 
    w.id,
    u.id,
    u.primary_role,
    NOW(),
    NOW()
FROM "user" u
JOIN workspaces w ON w.org_id = u.org_id AND w.slug LIKE '%-finance'
WHERE u.email LIKE '%.prism.local' AND u.primary_role = 'finops_manager'
ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();
