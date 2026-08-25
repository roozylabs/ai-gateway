ALTER TABLE request_logs ADD COLUMN response_hash CHAR(64);
ALTER TABLE request_logs ADD COLUMN response_bytes INTEGER;
