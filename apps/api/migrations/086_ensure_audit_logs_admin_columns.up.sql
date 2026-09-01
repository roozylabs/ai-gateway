-- Migration 086: Ensure audit_logs baseline columns for System Administration Action Logs
-- Migration 074 guarantees the baseline audit_logs table; 074/065 create the
-- org/action/actor indexes and actor_ip/actor_user_agent. This migration fills the
-- remaining columns consumed by AuditLogRepository.CreateAuditLog and ListAuditLogs.

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
    ADD COLUMN IF NOT EXISTS actor_email VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS resource VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS actor_ip VARCHAR(45) DEFAULT '',
    ADD COLUMN IF NOT EXISTS actor_user_agent TEXT DEFAULT '';

-- 074 created resource_type NOT NULL without a default; CreateAuditLog no longer
-- supplies it, so relax the column so admin action inserts do not fail on fresh DBs.
ALTER TABLE audit_logs ALTER COLUMN resource_type DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN resource_type SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_status ON audit_logs(action, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);