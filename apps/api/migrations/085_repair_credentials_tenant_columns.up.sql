-- Migration 085: Force Repair Multi-Tenant Isolation (user_id and org_id) on Credentials Table
-- Resolves live schema drift where migration 083/084 was recorded in schema_migrations without landing DDL

-- 1. Add user_id and org_id columns to credentials idempotently
ALTER TABLE credentials 
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

-- 2. Backfill existing credentials to inherit user_id and org_id from parent providers table
UPDATE credentials c
SET user_id = p.user_id,
    org_id = COALESCE(p.org_id, 'org_default')
FROM providers p
WHERE c.provider_id = p.id
  AND (c.user_id IS NULL OR c.user_id = '')
  AND p.user_id IS NOT NULL
  AND p.user_id != '';

-- 3. Fallback backfill for any orphan credentials
UPDATE credentials
SET user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE user_id IS NULL OR user_id = '';

-- 4. Create high-performance multi-tenant indexes
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_org_id ON credentials(org_id);
CREATE INDEX IF NOT EXISTS idx_credentials_provider_user ON credentials(provider_id, user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_enabled ON credentials(user_id, enabled);

-- 5. Ensure PostgreSQL Row Level Security (RLS) Policy for Credentials
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credentials_tenant_policy ON credentials;
CREATE POLICY credentials_tenant_policy ON credentials
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IS NULL
        OR current_setting('app.current_user_id', true) = ''
        OR current_setting('app.current_user_id', true) = 'user_admin'
        OR user_id = current_setting('app.current_user_id', true)
        OR org_id = current_setting('app.current_org_id', true)
    );
