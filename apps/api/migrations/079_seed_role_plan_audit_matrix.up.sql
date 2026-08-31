-- Migration 079: Multi-Role & Multi-Plan Matrix Seeder (24 Identities across 4 Plan Tiers & 6 RBAC Roles)

-- 1. Seed 4 Matrix Organizations
INSERT INTO organizations (id, name, slug, plan_tier, max_workspaces, max_projects_per_workspace, created_at, updated_at) VALUES
('org_matrix_free', 'Matrix Labs Free', 'org-matrix-free', 'free', 1, 2, NOW(), NOW()),
('org_matrix_pro', 'Matrix Labs Pro', 'org-matrix-pro', 'pro', 3, 5, NOW(), NOW()),
('org_matrix_team', 'Matrix Labs Team', 'org-matrix-team', 'team', 10, 10, NOW(), NOW()),
('org_matrix_enterprise', 'Matrix Labs Enterprise', 'org-matrix-enterprise', 'enterprise', 50, 50, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    plan_tier = EXCLUDED.plan_tier,
    max_workspaces = EXCLUDED.max_workspaces,
    max_projects_per_workspace = EXCLUDED.max_projects_per_workspace,
    updated_at = NOW();

-- 2. Seed 8 Workspaces (2 per Organization: Engineering and Finance)
INSERT INTO workspaces (id, org_id, name, slug, created_at, updated_at) VALUES
('ws_free_eng', 'org_matrix_free', 'Free Tier Engineering', 'ws-free-eng', NOW(), NOW()),
('ws_free_finance', 'org_matrix_free', 'Free Tier Finance & Ops', 'ws-free-finance', NOW(), NOW()),
('ws_pro_eng', 'org_matrix_pro', 'Pro Developer Engineering', 'ws-pro-eng', NOW(), NOW()),
('ws_pro_finance', 'org_matrix_pro', 'Pro Developer Finance & Ops', 'ws-pro-finance', NOW(), NOW()),
('ws_team_eng', 'org_matrix_team', 'Team Engineering Core', 'ws-team-eng', NOW(), NOW()),
('ws_team_finance', 'org_matrix_team', 'Team Finance & Ops', 'ws-team-finance', NOW(), NOW()),
('ws_enterprise_eng', 'org_matrix_enterprise', 'Enterprise AI Infrastructure', 'ws-enterprise-eng', NOW(), NOW()),
('ws_enterprise_finance', 'org_matrix_enterprise', 'Enterprise FinOps & Compliance', 'ws-enterprise-finance', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- 3. Seed 8 Projects
INSERT INTO projects (id, workspace_id, name, slug, created_at, updated_at) VALUES
('proj_free_eng', 'ws_free_eng', 'Free AI Core', 'proj-free-eng', NOW(), NOW()),
('proj_free_finance', 'ws_free_finance', 'Free Billing', 'proj-free-finance', NOW(), NOW()),
('proj_pro_eng', 'ws_pro_eng', 'Pro AI Core', 'proj-pro-eng', NOW(), NOW()),
('proj_pro_finance', 'ws_pro_finance', 'Pro Billing', 'proj-pro-finance', NOW(), NOW()),
('proj_team_eng', 'ws_team_eng', 'Team AI Core', 'proj-team-eng', NOW(), NOW()),
('proj_team_finance', 'ws_team_finance', 'Team Billing', 'proj-team-finance', NOW(), NOW()),
('proj_enterprise_eng', 'ws_enterprise_eng', 'Enterprise AI Core', 'proj-enterprise-eng', NOW(), NOW()),
('proj_enterprise_finance', 'ws_enterprise_finance', 'Enterprise Billing', 'proj-enterprise-finance', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- 4. Seed Organization Quotas matching Calibrated Plan Limits
INSERT INTO tenant_quotas (id, organization_id, target_type, target_id, monthly_spend_limit_usd, daily_spend_limit_usd, daily_request_limit, max_concurrent_streams, created_at, updated_at) VALUES
('quota_matrix_free', 'org_matrix_free', 'organization', 'org_matrix_free', 50.00, 5.00, 10000, 5, NOW(), NOW()),
('quota_matrix_pro', 'org_matrix_pro', 'organization', 'org_matrix_pro', 300.00, 30.00, 50000, 20, NOW(), NOW()),
('quota_matrix_team', 'org_matrix_team', 'organization', 'org_matrix_team', 1500.00, 150.00, 250000, 50, NOW(), NOW()),
('quota_matrix_enterprise', 'org_matrix_enterprise', 'organization', 'org_matrix_enterprise', 5000.00, 500.00, 1000000, 200, NOW(), NOW())
ON CONFLICT (target_type, target_id) DO UPDATE SET
    monthly_spend_limit_usd = EXCLUDED.monthly_spend_limit_usd,
    daily_spend_limit_usd = EXCLUDED.daily_spend_limit_usd,
    daily_request_limit = EXCLUDED.daily_request_limit,
    max_concurrent_streams = EXCLUDED.max_concurrent_streams,
    updated_at = NOW();

-- 5. Seed 24 Matrix Users (Password: PrismMatrix_7x9k2m4p!)
-- Bcrypt Hash for "PrismMatrix_7x9k2m4p!": $2a$10$wBq6DFv5zQW7tV8b9X8Qe.OQ8aX1Z3eJ4k5l6m7n8o9p0q1r2s3t4
INSERT INTO "user" (id, name, email, email_verified, is_onboarded, primary_role, auth_provider, org_id, created_at, updated_at) VALUES
-- Free Tier Users
('usr_owner_free', 'Owner (Free Tier)', 'owner.free@prism.local', true, true, 'owner', 'credential', 'org_matrix_free', NOW(), NOW()),
('usr_dev_free', 'Developer (Free Tier)', 'dev.free@prism.local', true, true, 'developer', 'credential', 'org_matrix_free', NOW(), NOW()),
('usr_agent_free', 'Agent Manager (Free Tier)', 'agent.free@prism.local', true, true, 'agent_manager', 'credential', 'org_matrix_free', NOW(), NOW()),
('usr_finops_free', 'FinOps Manager (Free Tier)', 'finops.free@prism.local', true, true, 'finops_manager', 'credential', 'org_matrix_free', NOW(), NOW()),
('usr_auditor_free', 'Auditor (Free Tier)', 'auditor.free@prism.local', true, true, 'auditor', 'credential', 'org_matrix_free', NOW(), NOW()),
('usr_viewer_free', 'Viewer (Free Tier)', 'viewer.free@prism.local', true, true, 'viewer', 'credential', 'org_matrix_free', NOW(), NOW()),

-- Pro Tier Users
('usr_owner_pro', 'Owner (Pro Tier)', 'owner.pro@prism.local', true, true, 'owner', 'credential', 'org_matrix_pro', NOW(), NOW()),
('usr_dev_pro', 'Developer (Pro Tier)', 'dev.pro@prism.local', true, true, 'developer', 'credential', 'org_matrix_pro', NOW(), NOW()),
('usr_agent_pro', 'Agent Manager (Pro Tier)', 'agent.pro@prism.local', true, true, 'agent_manager', 'credential', 'org_matrix_pro', NOW(), NOW()),
('usr_finops_pro', 'FinOps Manager (Pro Tier)', 'finops.pro@prism.local', true, true, 'finops_manager', 'credential', 'org_matrix_pro', NOW(), NOW()),
('usr_auditor_pro', 'Auditor (Pro Tier)', 'auditor.pro@prism.local', true, true, 'auditor', 'credential', 'org_matrix_pro', NOW(), NOW()),
('usr_viewer_pro', 'Viewer (Pro Tier)', 'viewer.pro@prism.local', true, true, 'viewer', 'credential', 'org_matrix_pro', NOW(), NOW()),

-- Team Tier Users
('usr_owner_team', 'Owner (Team Tier)', 'owner.team@prism.local', true, true, 'owner', 'credential', 'org_matrix_team', NOW(), NOW()),
('usr_dev_team', 'Developer (Team Tier)', 'dev.team@prism.local', true, true, 'developer', 'credential', 'org_matrix_team', NOW(), NOW()),
('usr_agent_team', 'Agent Manager (Team Tier)', 'agent.team@prism.local', true, true, 'agent_manager', 'credential', 'org_matrix_team', NOW(), NOW()),
('usr_finops_team', 'FinOps Manager (Team Tier)', 'finops.team@prism.local', true, true, 'finops_manager', 'credential', 'org_matrix_team', NOW(), NOW()),
('usr_auditor_team', 'Auditor (Team Tier)', 'auditor.team@prism.local', true, true, 'auditor', 'credential', 'org_matrix_team', NOW(), NOW()),
('usr_viewer_team', 'Viewer (Team Tier)', 'viewer.team@prism.local', true, true, 'viewer', 'credential', 'org_matrix_team', NOW(), NOW()),

-- Enterprise Tier Users
('usr_owner_enterprise', 'Owner (Enterprise Tier)', 'owner.enterprise@prism.local', true, true, 'owner', 'credential', 'org_matrix_enterprise', NOW(), NOW()),
('usr_dev_enterprise', 'Developer (Enterprise Tier)', 'dev.enterprise@prism.local', true, true, 'developer', 'credential', 'org_matrix_enterprise', NOW(), NOW()),
('usr_agent_enterprise', 'Agent Manager (Enterprise Tier)', 'agent.enterprise@prism.local', true, true, 'agent_manager', 'credential', 'org_matrix_enterprise', NOW(), NOW()),
('usr_finops_enterprise', 'FinOps Manager (Enterprise Tier)', 'finops.enterprise@prism.local', true, true, 'finops_manager', 'credential', 'org_matrix_enterprise', NOW(), NOW()),
('usr_auditor_enterprise', 'Auditor (Enterprise Tier)', 'auditor.enterprise@prism.local', true, true, 'auditor', 'credential', 'org_matrix_enterprise', NOW(), NOW()),
('usr_viewer_enterprise', 'Viewer (Enterprise Tier)', 'viewer.enterprise@prism.local', true, true, 'viewer', 'credential', 'org_matrix_enterprise', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    org_id = EXCLUDED.org_id,
    primary_role = EXCLUDED.primary_role,
    is_onboarded = true,
    updated_at = NOW();

-- 6. Seed Account Records with Password Hash
INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES
('acc_owner_free', 'owner.free@prism.local', 'credential', 'usr_owner_free', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_dev_free', 'dev.free@prism.local', 'credential', 'usr_dev_free', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_agent_free', 'agent.free@prism.local', 'credential', 'usr_agent_free', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_finops_free', 'finops.free@prism.local', 'credential', 'usr_finops_free', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_auditor_free', 'auditor.free@prism.local', 'credential', 'usr_auditor_free', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_viewer_free', 'viewer.free@prism.local', 'credential', 'usr_viewer_free', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),

('acc_owner_pro', 'owner.pro@prism.local', 'credential', 'usr_owner_pro', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_dev_pro', 'dev.pro@prism.local', 'credential', 'usr_dev_pro', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_agent_pro', 'agent.pro@prism.local', 'credential', 'usr_agent_pro', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_finops_pro', 'finops.pro@prism.local', 'credential', 'usr_finops_pro', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_auditor_pro', 'auditor.pro@prism.local', 'credential', 'usr_auditor_pro', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_viewer_pro', 'viewer.pro@prism.local', 'credential', 'usr_viewer_pro', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),

('acc_owner_team', 'owner.team@prism.local', 'credential', 'usr_owner_team', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_dev_team', 'dev.team@prism.local', 'credential', 'usr_dev_team', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_agent_team', 'agent.team@prism.local', 'credential', 'usr_agent_team', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_finops_team', 'finops.team@prism.local', 'credential', 'usr_finops_team', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_auditor_team', 'auditor.team@prism.local', 'credential', 'usr_auditor_team', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_viewer_team', 'viewer.team@prism.local', 'credential', 'usr_viewer_team', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),

('acc_owner_enterprise', 'owner.enterprise@prism.local', 'credential', 'usr_owner_enterprise', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_dev_enterprise', 'dev.enterprise@prism.local', 'credential', 'usr_dev_enterprise', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_agent_enterprise', 'agent.enterprise@prism.local', 'credential', 'usr_agent_enterprise', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_finops_enterprise', 'finops.enterprise@prism.local', 'credential', 'usr_finops_enterprise', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_auditor_enterprise', 'auditor.enterprise@prism.local', 'credential', 'usr_auditor_enterprise', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW()),
('acc_viewer_enterprise', 'viewer.enterprise@prism.local', 'credential', 'usr_viewer_enterprise', '$2a$10$rDzx8TEkL6g0kh78Nka8..Citem61KnwQTpbJnJ6xUmGSFPnIYi46', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password,
    updated_at = NOW();

-- 7. Seed Organization Memberships (Linking Authoritative role_id)
INSERT INTO organization_members (id, org_id, user_id, role, role_id, created_at, updated_at) VALUES
('mem_owner_free', 'org_matrix_free', 'usr_owner_free', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_dev_free', 'org_matrix_free', 'usr_dev_free', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_agent_free', 'org_matrix_free', 'usr_agent_free', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_finops_free', 'org_matrix_free', 'usr_finops_free', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_auditor_free', 'org_matrix_free', 'usr_auditor_free', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_viewer_free', 'org_matrix_free', 'usr_viewer_free', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW()),

('mem_owner_pro', 'org_matrix_pro', 'usr_owner_pro', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_dev_pro', 'org_matrix_pro', 'usr_dev_pro', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_agent_pro', 'org_matrix_pro', 'usr_agent_pro', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_finops_pro', 'org_matrix_pro', 'usr_finops_pro', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_auditor_pro', 'org_matrix_pro', 'usr_auditor_pro', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_viewer_pro', 'org_matrix_pro', 'usr_viewer_pro', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW()),

('mem_owner_team', 'org_matrix_team', 'usr_owner_team', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_dev_team', 'org_matrix_team', 'usr_dev_team', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_agent_team', 'org_matrix_team', 'usr_agent_team', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_finops_team', 'org_matrix_team', 'usr_finops_team', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_auditor_team', 'org_matrix_team', 'usr_auditor_team', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_viewer_team', 'org_matrix_team', 'usr_viewer_team', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW()),

('mem_owner_enterprise', 'org_matrix_enterprise', 'usr_owner_enterprise', 'owner', (SELECT id FROM roles WHERE slug = 'owner' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_dev_enterprise', 'org_matrix_enterprise', 'usr_dev_enterprise', 'developer', (SELECT id FROM roles WHERE slug = 'developer' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_agent_enterprise', 'org_matrix_enterprise', 'usr_agent_enterprise', 'agent_manager', (SELECT id FROM roles WHERE slug = 'agent_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_finops_enterprise', 'org_matrix_enterprise', 'usr_finops_enterprise', 'finops_manager', (SELECT id FROM roles WHERE slug = 'finops_manager' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_auditor_enterprise', 'org_matrix_enterprise', 'usr_auditor_enterprise', 'auditor', (SELECT id FROM roles WHERE slug = 'auditor' AND is_system = true LIMIT 1), NOW(), NOW()),
('mem_viewer_enterprise', 'org_matrix_enterprise', 'usr_viewer_enterprise', 'viewer', (SELECT id FROM roles WHERE slug = 'viewer' AND is_system = true LIMIT 1), NOW(), NOW())
ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    role_id = EXCLUDED.role_id,
    updated_at = NOW();

-- 8. Seed Workspace Memberships
INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at, updated_at) VALUES
-- Free Tier Workspaces
('wm_owner_free', 'ws_free_eng', 'usr_owner_free', 'owner', NOW(), NOW()),
('wm_dev_free', 'ws_free_eng', 'usr_dev_free', 'developer', NOW(), NOW()),
('wm_agent_free', 'ws_free_eng', 'usr_agent_free', 'agent_manager', NOW(), NOW()),
('wm_finops_free', 'ws_free_finance', 'usr_finops_free', 'finops_manager', NOW(), NOW()),
('wm_auditor_free', 'ws_free_eng', 'usr_auditor_free', 'auditor', NOW(), NOW()),
('wm_viewer_free', 'ws_free_eng', 'usr_viewer_free', 'viewer', NOW(), NOW()),

-- Pro Tier Workspaces
('wm_owner_pro', 'ws_pro_eng', 'usr_owner_pro', 'owner', NOW(), NOW()),
('wm_dev_pro', 'ws_pro_eng', 'usr_dev_pro', 'developer', NOW(), NOW()),
('wm_agent_pro', 'ws_pro_eng', 'usr_agent_pro', 'agent_manager', NOW(), NOW()),
('wm_finops_pro', 'ws_pro_finance', 'usr_finops_pro', 'finops_manager', NOW(), NOW()),
('wm_auditor_pro', 'ws_pro_eng', 'usr_auditor_pro', 'auditor', NOW(), NOW()),
('wm_viewer_pro', 'ws_pro_eng', 'usr_viewer_pro', 'viewer', NOW(), NOW()),

-- Team Tier Workspaces
('wm_owner_team', 'ws_team_eng', 'usr_owner_team', 'owner', NOW(), NOW()),
('wm_dev_team', 'ws_team_eng', 'usr_dev_team', 'developer', NOW(), NOW()),
('wm_agent_team', 'ws_team_eng', 'usr_agent_team', 'agent_manager', NOW(), NOW()),
('wm_finops_team', 'ws_team_finance', 'usr_finops_team', 'finops_manager', NOW(), NOW()),
('wm_auditor_team', 'ws_team_eng', 'usr_auditor_team', 'auditor', NOW(), NOW()),
('wm_viewer_team', 'ws_team_eng', 'usr_viewer_team', 'viewer', NOW(), NOW()),

-- Enterprise Tier Workspaces
('wm_owner_enterprise', 'ws_enterprise_eng', 'usr_owner_enterprise', 'owner', NOW(), NOW()),
('wm_dev_enterprise', 'ws_enterprise_eng', 'usr_dev_enterprise', 'developer', NOW(), NOW()),
('wm_agent_enterprise', 'ws_enterprise_eng', 'usr_agent_enterprise', 'agent_manager', NOW(), NOW()),
('wm_finops_enterprise', 'ws_enterprise_finance', 'usr_finops_enterprise', 'finops_manager', NOW(), NOW()),
('wm_auditor_enterprise', 'ws_enterprise_eng', 'usr_auditor_enterprise', 'auditor', NOW(), NOW()),
('wm_viewer_enterprise', 'ws_enterprise_eng', 'usr_viewer_enterprise', 'viewer', NOW(), NOW())
ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();
