-- Rollback Migration 079

DELETE FROM workspace_members WHERE workspace_id IN ('ws_free_eng', 'ws_free_finance', 'ws_pro_eng', 'ws_pro_finance', 'ws_team_eng', 'ws_team_finance', 'ws_enterprise_eng', 'ws_enterprise_finance');
DELETE FROM organization_members WHERE org_id IN ('org_matrix_free', 'org_matrix_pro', 'org_matrix_team', 'org_matrix_enterprise');
DELETE FROM account WHERE user_id LIKE 'usr_%_free' OR user_id LIKE 'usr_%_pro' OR user_id LIKE 'usr_%_team' OR user_id LIKE 'usr_%_enterprise';
DELETE FROM "user" WHERE id LIKE 'usr_%_free' OR id LIKE 'usr_%_pro' OR id LIKE 'usr_%_team' OR id LIKE 'usr_%_enterprise';
DELETE FROM tenant_quotas WHERE id IN ('quota_matrix_free', 'quota_matrix_pro', 'quota_matrix_team', 'quota_matrix_enterprise');
DELETE FROM projects WHERE id IN ('proj_free_eng', 'proj_free_finance', 'proj_pro_eng', 'proj_pro_finance', 'proj_team_eng', 'proj_team_finance', 'proj_enterprise_eng', 'proj_enterprise_finance');
DELETE FROM workspaces WHERE id IN ('ws_free_eng', 'ws_free_finance', 'ws_pro_eng', 'ws_pro_finance', 'ws_team_eng', 'ws_team_finance', 'ws_enterprise_eng', 'ws_enterprise_finance');
DELETE FROM organizations WHERE id IN ('org_matrix_free', 'org_matrix_pro', 'org_matrix_team', 'org_matrix_enterprise');
