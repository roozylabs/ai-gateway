ALTER TABLE credentials ADD COLUMN masked_key VARCHAR(255) DEFAULT '';

ALTER TABLE request_logs ADD COLUMN request_id UUID;

CREATE UNIQUE INDEX idx_request_logs_request_id ON request_logs(request_id);
