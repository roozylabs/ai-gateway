DROP INDEX IF EXISTS idx_request_logs_agent_id;
ALTER TABLE request_logs DROP COLUMN IF EXISTS agent_id;
