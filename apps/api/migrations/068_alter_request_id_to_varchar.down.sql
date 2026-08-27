-- Down migration 068
ALTER TABLE request_logs ALTER COLUMN request_id TYPE VARCHAR(100) USING request_id::text;
ALTER TABLE request_payloads ALTER COLUMN request_id TYPE VARCHAR(100) USING request_id::text;
ALTER TABLE tool_invocations ALTER COLUMN request_id TYPE VARCHAR(100) USING request_id::text;
