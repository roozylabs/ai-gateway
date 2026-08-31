-- Rollback Migration 081

DELETE FROM workspace_members WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@prism.local');
DELETE FROM organization_members WHERE user_id IN (SELECT id FROM "user" WHERE email LIKE '%@prism.local');
DELETE FROM account WHERE account_id LIKE '%@prism.local';
