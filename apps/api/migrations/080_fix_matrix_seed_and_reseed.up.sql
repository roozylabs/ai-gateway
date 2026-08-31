-- Migration 080: Fix Role CHECK Constraints and Re-seed Matrix Users with Natural UUIDs

-- 1. Relax/Expand CHECK constraints on organization_members.role and workspace_members.role
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check 
    CHECK (role IN ('owner', 'admin', 'developer', 'billing_manager', 'agent_manager', 'finops_manager', 'auditor', 'viewer'));

ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
    CHECK (role IN ('owner', 'admin', 'developer', 'operator', 'agent_manager', 'finops_manager', 'auditor', 'viewer'));

-- 2. Seed 4 Matrix Organizations (UUIDs: 10000000-0000-0000-0000-000000000001..4)
INSERT INTO organizations (id, name, slug, plan_tier, max_workspaces, max_projects_per_workspace, created_at, updated_at) VALUES
('10000000-0000-0000-0000-000000000001', 'Matrix Labs Free', 'org-matrix-free', 'free', 1, 2, NOW(), NOW()),
('10000000-0000-0000-0000-000000000002', 'Matrix Labs Pro', 'org-matrix-pro', 'pro', 3, 5, NOW(), NOW()),
('10000000-0000-0000-0000-000000000003', 'Matrix Labs Team', 'org-matrix-team', 'team', 10, 10, NOW(), NOW()),
('10000000-0000-0000-0000-000000000004', 'Matrix Labs Enterprise', 'org-matrix-enterprise', 'enterprise', 50, 50, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    plan_tier = EXCLUDED.plan_tier,
    max_workspaces = EXCLUDED.max_workspaces,
    max_projects_per_workspace = EXCLUDED.max_projects_per_workspace,
    updated_at = NOW();

-- 3. Seed 8 Workspaces (UUIDs: 20000000-0000-0000-0000-000000000001..8)
INSERT INTO workspaces (id, org_id, name, slug, created_at, updated_at) VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Free Tier Engineering', 'ws-free-eng', NOW(), NOW()),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Free Tier Finance & Ops', 'ws-free-finance', NOW(), NOW()),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Pro Developer Engineering', 'ws-pro-eng', NOW(), NOW()),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Pro Developer Finance & Ops', 'ws-pro-finance', NOW(), NOW()),
('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Team Engineering Core', 'ws-team-eng', NOW(), NOW()),
('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Team Finance & Ops', 'ws-team-finance', NOW(), NOW()),
('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000004', 'Enterprise AI Infrastructure', 'ws-enterprise-eng', NOW(), NOW()),
('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'Enterprise FinOps & Compliance', 'ws-enterprise-finance', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    updated_at = NOW();

-- 4. Seed 8 Projects (UUIDs: 30000000-0000-0000-0000-000000000001..8)
INSERT INTO projects (id, workspace_id, name, slug, created_at, updated_at) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Free AI Core', 'proj-free-eng', NOW(), NOW()),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Free Billing', 'proj-free-finance', NOW(), NOW()),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Pro AI Core', 'proj-pro-eng', NOW(), NOW()),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'Pro Billing', 'proj-pro-finance', NOW(), NOW()),
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'Team AI Core', 'proj-team-eng', NOW(), NOW()),
('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'Team Billing', 'proj-team-finance', NOW(), NOW()),
('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'Enterprise AI Core', 'proj-enterprise-eng', NOW(), NOW()),
('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', 'Enterprise Billing', 'proj-enterprise-finance', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    updated_at = NOW();

-- 5. Seed Organization Quotas (Omit ID so PostgreSQL uses gen_random_uuid())
INSERT INTO tenant_quotas (organization_id, target_type, target_id, monthly_spend_limit_usd, daily_spend_limit_usd, daily_request_limit, max_concurrent_streams, created_at, updated_at) VALUES
('10000000-0000-0000-0000-000000000001', 'organization', '10000000-0000-0000-0000-000000000001', 50.00, 5.00, 10000, 5, NOW(), NOW()),
('10000000-0000-0000-0000-000000000002', 'organization', '10000000-0000-0000-0000-000000000002', 300.00, 30.00, 50000, 20, NOW(), NOW()),
('10000000-0000-0000-0000-000000000003', 'organization', '10000000-0000-0000-0000-000000000003', 1500.00, 150.00, 250000, 50, NOW(), NOW()),
('10000000-0000-0000-0000-000000000004', 'organization', '10000000-0000-0000-0000-000000000004', 5000.00, 500.00, 1000000, 200, NOW(), NOW())
ON CONFLICT (target_type, target_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
    daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
    daily_request_limit = EXCLUDED.daily_request_limit,
    max_concurrent_streams = EXCLUDED.max_concurrent_streams,
    updated_at = NOW();

-- 6. Seed 24 Matrix Users (UUIDs: 40000000-0000-0000-000[1..4]-00000000000[1..6])
INSERT INTO "user" (id, name, email, email_verified, is_onboarded, primary_role, auth_provider, org_id, created_at, updated_at) VALUES
-- Free Tier Users
('40000000-0000-0000-0001-000000000001', 'Owner (Free Tier)', 'owner.free@prism.local', true, true, 'owner', 'credential', '10000000-0000-0000-0000-000000000001', NOW(), NOW()),
('40000000-0000-0000-0001-000000000002', 'Developer (Free Tier)', 'dev.free@prism.local', true, true, 'developer', 'credential', '10000000-0000-0000-0000-000000000001', NOW(), NOW()),
('40000000-0000-0000-0001-000000000003', 'Agent Manager (Free Tier)', 'agent.free@prism.local', true, true, 'agent_manager', 'credential', '10000000-0000-0000-0000-000000000001', NOW(), NOW()),
('40000000-0000-0000-0001-000000000004', 'FinOps Manager (Free Tier)', 'finops.free@prism.local', true, true, 'finops_manager', 'credential', '10000000-0000-0000-0000-000000000001', NOW(), NOW()),
('40000000-0000-0000-0001-000000000005', 'Auditor (Free Tier)', 'auditor.free@prism.local', true, true, 'auditor', 'credential', '10000000-0000-0000-0000-000000000001', NOW(), NOW()),
('40000000-0000-0000-0001-000000000006', 'Viewer (Free Tier)', 'viewer.free@prism.local', true, true, 'viewer', 'credential', '10000000-0000-0000-0000-000000000001', NOW(), NOW()),

-- Pro Tier Users
('40000000-0000-0000-0002-000000000001', 'Owner (Pro Tier)', 'owner.pro@prism.local', true, true, 'owner', 'credential', '10000000-0000-0000-0000-000000000002', NOW(), NOW()),
('40000000-0000-0000-0002-000000000002', 'Developer (Pro Tier)', 'dev.pro@prism.local', true, true, 'developer', 'credential', '10000000-0000-0000-0000-000000000002', NOW(), NOW()),
('40000000-0000-0000-0002-000000000003', 'Agent Manager (Pro Tier)', 'agent.pro@prism.local', true, true, 'agent_manager', 'credential', '10000000-0000-0000-0000-000000000002', NOW(), NOW()),
('40000000-0000-0000-0002-000000000004', 'FinOps Manager (Pro Tier)', 'finops.pro@prism.local', true, true, 'finops_manager', 'credential', '10000000-0000-0000-0000-000000000002', NOW(), NOW()),
('40000000-0000-0000-0002-000000000005', 'Auditor (Pro Tier)', 'auditor.pro@prism.local', true, true, 'auditor', 'credential', '10000000-0000-0000-0000-000000000002', NOW(), NOW()),
('40000000-0000-0000-0002-000000000006', 'Viewer (Pro Tier)', 'viewer.pro@prism.local', true, true, 'viewer', 'credential', '10000000-0000-0000-0000-000000000002', NOW(), NOW()),

-- Team Tier Users
('40000000-0000-0000-0003-000000000001', 'Owner (Team Tier)', 'owner.team@prism.local', true, true, 'owner', 'credential', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),
('40000000-0000-0000-0003-000000000002', 'Developer (Team Tier)', 'dev.team@prism.local', true, true, 'developer', 'credential', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),
('40000000-0000-0000-0003-000000000003', 'Agent Manager (Team Tier)', 'agent.team@prism.local', true, true, 'agent_manager', 'credential', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),
('40000000-0000-0000-0003-000000000004', 'FinOps Manager (Team Tier)', 'finops.team@prism.local', true, true, 'finops_manager', 'credential', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),
('40000000-0000-0000-0003-000000000005', 'Auditor (Team Tier)', 'auditor.team@prism.local', true, true, 'auditor', 'credential', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),
('40000000-0000-0000-0003-000000000006', 'Viewer (Team Tier)', 'viewer.team@prism.local', true, true, 'viewer', 'credential', '10000000-0000-0000-0000-000000000003', NOW(), NOW()),

-- Enterprise Tier Users
('40000000-0000-0000-0004-000000000001', 'Owner (Enterprise Tier)', 'owner.enterprise@prism.local', true, true, 'owner', 'credential', '10000000-0000-0000-0000-000000000004', NOW(), NOW()),
('40000000-0000-0000-0004-000000000002', 'Developer (Enterprise Tier)', 'dev.enterprise@prism.local', true, true, 'developer', 'credential', '10000000-0000-0000-0000-000000000004', NOW(), NOW()),
('40000000-0000-0000-0004-000000000003', 'Agent Manager (Enterprise Tier)', 'agent.enterprise@prism.local', true, true, 'agent_manager', 'credential', '10000000-0000-0000-0000-000000000004', NOW(), NOW()),
('40000000-0000-0000-0004-000000000004', 'FinOps Manager (Enterprise Tier)', 'finops.enterprise@prism.local', true, true, 'finops_manager', 'credential', '10000000-0000-0000-0000-000000000004', NOW(), NOW()),
('40000000-0000-0000-0004-000000000005', 'Auditor (Enterprise Tier)', 'auditor.enterprise@prism.local', true, true, 'auditor', 'credential', '10000000-0000-0000-0000-000000000004', NOW(), NOW()),
('40000000-0000-0000-0004-000000000006', 'Viewer (Enterprise Tier)', 'viewer.enterprise@prism.local', true, true, 'viewer', 'credential', '10000000-0000-0000-0000-000000000004', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    org_id = EXCLUDED.org_id,
    primary_role = EXCLUDED.primary_role,
    is_onboarded = true,
    updated_at = NOW();

-- 7. Seed Account Records (UUIDs: 50000000-0000-0000-000[1..4]-00000000000[1..6], Verified bcrypt hash for PrismMatrix_7x9k2m4p!)
INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES
('50000000-0000-0000-0001-000000000001', 'owner.free@prism.local', 'credential', '40000000-0000-0000-0001-000000000001', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0001-000000000002', 'dev.free@prism.local', 'credential', '40000000-0000-0000-0001-000000000002', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0001-000000000003', 'agent.free@prism.local', 'credential', '40000000-0000-0000-0001-000000000003', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0001-000000000004', 'finops.free@prism.local', 'credential', '40000000-0000-0000-0001-000000000004', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0001-000000000005', 'auditor.free@prism.local', 'credential', '40000000-0000-0000-0001-000000000005', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0001-000000000006', 'viewer.free@prism.local', 'credential', '40000000-0000-0000-0001-000000000006', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),

('50000000-0000-0000-0002-000000000001', 'owner.pro@prism.local', 'credential', '40000000-0000-0000-0002-000000000001', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0002-000000000002', 'dev.pro@prism.local', 'credential', '40000000-0000-0000-0002-000000000002', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0002-000000000003', 'agent.pro@prism.local', 'credential', '40000000-0000-0000-0002-000000000003', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0002-000000000004', 'finops.pro@prism.local', 'credential', '40000000-0000-0000-0002-000000000004', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0002-000000000005', 'auditor.pro@prism.local', 'credential', '40000000-0000-0000-0002-000000000005', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0002-000000000006', 'viewer.pro@prism.local', 'credential', '40000000-0000-0000-0002-000000000006', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),

('50000000-0000-0000-0003-000000000001', 'owner.team@prism.local', 'credential', '40000000-0000-0000-0003-000000000001', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0003-000000000002', 'dev.team@prism.local', 'credential', '40000000-0000-0000-0003-000000000002', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0003-000000000003', 'agent.team@prism.local', 'credential', '40000000-0000-0000-0003-000000000003', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0003-000000000004', 'finops.team@prism.local', 'credential', '40000000-0000-0000-0003-000000000004', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0003-000000000005', 'auditor.team@prism.local', 'credential', '40000000-0000-0000-0003-000000000005', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0003-000000000006', 'viewer.team@prism.local', 'credential', '40000000-0000-0000-0003-000000000006', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),

('50000000-0000-0000-0004-000000000001', 'owner.enterprise@prism.local', 'credential', '40000000-0000-0000-0004-000000000001', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0004-000000000002', 'dev.enterprise@prism.local', 'credential', '40000000-0000-0000-0004-000000000002', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0004-000000000003', 'agent.enterprise@prism.local', 'credential', '40000000-0000-0000-0004-000000000003', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0004-000000000004', 'finops.enterprise@prism.local', 'credential', '40000000-0000-0000-0004-000000000004', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0004-000000000005', 'auditor.enterprise@prism.local', 'credential', '40000000-0000-0000-0004-000000000005', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('50000000-0000-0000-0004-000000000006', 'viewer.enterprise@prism.local', 'credential', '40000000-0000-0000-0004-000000000006', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password,
    updated_at = NOW();

-- 8. Seed Organization Memberships (UUIDs: 60000000-0000-0000-000[1..4]-00000000000[1..6])
INSERT INTO organization_members (id, org_id, user_id, role, role_id, created_at, updated_at) VALUES
('60000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000001', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0001-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000002', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0001-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000003', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0001-000000000004', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000004', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0001-000000000005', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000005', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0001-000000000006', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000006', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW()),

('60000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0002-000000000001', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0002-000000000002', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0002-000000000003', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0002-000000000003', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0002-000000000004', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0002-000000000004', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0002-000000000005', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0002-000000000005', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0002-000000000006', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0002-000000000006', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW()),

('60000000-0000-0000-0003-000000000001', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0003-000000000001', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0003-000000000002', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0003-000000000002', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0003-000000000003', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0003-000000000003', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0003-000000000004', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0003-000000000004', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0003-000000000005', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0003-000000000005', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0003-000000000006', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0003-000000000006', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW()),

('60000000-0000-0000-0004-000000000001', '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-0004-000000000001', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0004-000000000002', '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-0004-000000000002', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0004-000000000003', '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-0004-000000000003', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0004-000000000004', '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-0004-000000000004', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0004-000000000005', '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-0004-000000000005', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('60000000-0000-0000-0004-000000000006', '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-0004-000000000006', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW())
ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    role_id = EXCLUDED.role_id,
    updated_at = NOW();

-- 9. Seed Workspace Memberships (Omit ID so PostgreSQL uses gen_random_uuid())
INSERT INTO workspace_members (workspace_id, user_id, role, created_at, updated_at) VALUES
-- Free Tier Workspaces
('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000001', 'owner', NOW(), NOW()),
('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000002', 'developer', NOW(), NOW()),
('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000003', 'agent_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0001-000000000004', 'finops_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000005', 'auditor', NOW(), NOW()),
('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0001-000000000006', 'viewer', NOW(), NOW()),

-- Pro Tier Workspaces
('20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0002-000000000001', 'owner', NOW(), NOW()),
('20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0002-000000000002', 'developer', NOW(), NOW()),
('20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0002-000000000003', 'agent_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000004', '40000000-0000-0000-0002-000000000004', 'finops_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0002-000000000005', 'auditor', NOW(), NOW()),
('20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0002-000000000006', 'viewer', NOW(), NOW()),

-- Team Tier Workspaces
('20000000-0000-0000-0000-000000000005', '40000000-0000-0000-0003-000000000001', 'owner', NOW(), NOW()),
('20000000-0000-0000-0000-000000000005', '40000000-0000-0000-0003-000000000002', 'developer', NOW(), NOW()),
('20000000-0000-0000-0000-000000000005', '40000000-0000-0000-0003-000000000003', 'agent_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000006', '40000000-0000-0000-0003-000000000004', 'finops_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000005', '40000000-0000-0000-0003-000000000005', 'auditor', NOW(), NOW()),
('20000000-0000-0000-0000-000000000005', '40000000-0000-0000-0003-000000000006', 'viewer', NOW(), NOW()),

-- Enterprise Tier Workspaces
('20000000-0000-0000-0000-000000000007', '40000000-0000-0000-0004-000000000001', 'owner', NOW(), NOW()),
('20000000-0000-0000-0000-000000000007', '40000000-0000-0000-0004-000000000002', 'developer', NOW(), NOW()),
('20000000-0000-0000-0000-000000000007', '40000000-0000-0000-0004-000000000003', 'agent_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000008', '40000000-0000-0000-0004-000000000004', 'finops_manager', NOW(), NOW()),
('20000000-0000-0000-0000-000000000007', '40000000-0000-0000-0004-000000000005', 'auditor', NOW(), NOW()),
('20000000-0000-0000-0000-000000000007', '40000000-0000-0000-0004-000000000006', 'viewer', NOW(), NOW())
ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();
