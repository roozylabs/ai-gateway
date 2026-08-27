ALTER TABLE request_logs ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_request_logs_agent_id ON request_logs(agent_id);
