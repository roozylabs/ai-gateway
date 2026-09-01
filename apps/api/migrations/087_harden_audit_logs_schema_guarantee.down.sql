-- Migration 087 Down: Rollback hardened audit_logs schema guarantee
ALTER TABLE audit_logs DROP COLUMN IF EXISTS details_json;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS resource;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS actor_email;

-- Restore the resource_type default only if the column still exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'resource_type'
    ) THEN
        ALTER TABLE audit_logs ALTER COLUMN resource_type DROP DEFAULT;
    END IF;
END $$;