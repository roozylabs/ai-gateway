DROP INDEX IF EXISTS idx_credentials_health_score;

ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_status_check;
ALTER TABLE credentials ADD CONSTRAINT credentials_status_check 
  CHECK (status IN ('active', 'rate_limited', 'invalid', 'disabled'));

ALTER TABLE credentials DROP COLUMN IF EXISTS health_score;
