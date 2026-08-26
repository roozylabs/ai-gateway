-- Add health_score column to credentials table (0.00 to 100.00, default 100.00)
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS health_score NUMERIC(5,2) DEFAULT 100.00 CHECK (health_score >= 0 AND health_score <= 100);

-- Update credentials status check constraint to support roadmap states
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_status_check;
ALTER TABLE credentials ADD CONSTRAINT credentials_status_check 
  CHECK (status IN ('healthy', 'degraded', 'cooldown', 'exhausted', 'disabled', 'active', 'rate_limited', 'invalid'));

-- Index for health-aware credential routing
CREATE INDEX IF NOT EXISTS idx_credentials_health_score ON credentials(health_score DESC);
