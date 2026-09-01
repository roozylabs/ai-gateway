-- Rollback Migration 084: Drop indexes and isolation columns from credentials table
DROP INDEX IF EXISTS idx_credentials_user_enabled;
DROP INDEX IF EXISTS idx_credentials_provider_user;
DROP INDEX IF EXISTS idx_credentials_org_id;
DROP INDEX IF EXISTS idx_credentials_user_id;

DROP POLICY IF EXISTS credentials_tenant_policy ON credentials;

ALTER TABLE credentials 
    DROP COLUMN IF EXISTS org_id,
    DROP COLUMN IF EXISTS user_id;
