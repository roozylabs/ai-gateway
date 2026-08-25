DROP INDEX IF EXISTS idx_request_logs_request_id;

ALTER TABLE request_logs DROP COLUMN IF EXISTS request_id;

ALTER TABLE credentials DROP COLUMN IF EXISTS masked_key;
