-- Create composite indexes for high-performance audit trail queries and compliance exports
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_status ON audit_logs(action, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);

-- Ensure client connection metadata columns exist
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_ip VARCHAR(45) DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_agent TEXT DEFAULT '';
