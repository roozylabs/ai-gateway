-- Migration 087: Harden audit_logs schema guarantee for System Administration Action Logs
-- Migration 086 established the baseline admin-log columns; this migration makes the
-- guarantee fully idempotent against any pre-existing audit_logs shape, so the columns
-- and indexes consumed by AuditLogRepository.CreateAuditLog and ListAuditLogs always exist.

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) DEFAULT 'org_default',
    actor_id VARCHAR(255),
    actor_email VARCHAR(255) DEFAULT '',
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) DEFAULT '',
    resource_type VARCHAR(255) DEFAULT '',
    resource_id VARCHAR(255),
    details_json TEXT DEFAULT '{}',
    details JSONB DEFAULT '{}'::jsonb,
    actor_ip VARCHAR(45) DEFAULT '',
    ip_address VARCHAR(45) DEFAULT '',
    actor_user_agent TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) DEFAULT 'org_default',
    ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS actor_email VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS resource VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS resource_type VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS actor_ip VARCHAR(45) DEFAULT '',
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) DEFAULT '',
    ADD COLUMN IF NOT EXISTS actor_user_agent TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'success',
    ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT '';

-- Safely relax NOT NULL on resource_type if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'resource_type' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE audit_logs ALTER COLUMN resource_type DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'resource_type'
    ) THEN
        ALTER TABLE audit_logs ALTER COLUMN resource_type SET DEFAULT '';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_status ON audit_logs(action, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);