DROP INDEX IF EXISTS idx_request_logs_cost;
ALTER TABLE request_logs DROP COLUMN IF EXISTS cost_usd;
