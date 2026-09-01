-- Migration 086 Down: Rollback audit_logs admin action log columns
ALTER TABLE audit_logs DROP COLUMN IF EXISTS details_json;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS resource;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS actor_email;

-- Restore the resource_type constraint from migration 074
ALTER TABLE audit_logs ALTER COLUMN resource_type DROP DEFAULT;
ALTER TABLE audit_logs ALTER COLUMN resource_type SET NOT NULL;