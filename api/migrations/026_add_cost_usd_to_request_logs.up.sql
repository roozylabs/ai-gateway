ALTER TABLE request_logs ADD COLUMN cost_usd NUMERIC(10, 6) DEFAULT 0;
CREATE INDEX idx_request_logs_cost ON request_logs(cost_usd);
