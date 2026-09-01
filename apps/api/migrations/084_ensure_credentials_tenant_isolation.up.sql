-- Migration 084: Explicitly Ensure Multi-Tenant Isolation (user_id and org_id) on Credentials Table
-- Resolves schema drift and guarantees Bring-Your-Own-Key (BYOK) tenant columns are created idempotently

-- 1. Add user_id and org_id columns to credentials if not present
ALTER TABLE credentials 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

-- 2. Backfill existing credentials to inherit user_id from parent providers table if available
UPDATE credentials c
SET user_id = p.user_id
FROM providers p
WHERE c.provider_id = p.id
  AND c.user_id IS NULL
  AND p.user_id IS NOT NULL
  AND p.user_id != ''
  AND p.user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- 3. Create high-performance multi-tenant indexes
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_org_id ON credentials(org_id);
CREATE INDEX IF NOT EXISTS idx_credentials_provider_user ON credentials(provider_id, user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_enabled ON credentials(user_id, enabled);

-- 4. Ensure PostgreSQL Row Level Security (RLS) Policy for Credentials
DROP POLICY IF EXISTS credentials_tenant_policy ON credentials;
CREATE POLICY credentials_tenant_policy ON credentials
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id::text = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );
