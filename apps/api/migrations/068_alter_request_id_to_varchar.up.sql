-- Migration 068: Convert request_id columns from UUID to VARCHAR(100) to support string request IDs (e.g. req_1787831378418380116)
ALTER TABLE request_logs ALTER COLUMN request_id TYPE VARCHAR(100) USING request_id::text;
ALTER TABLE request_payloads ALTER COLUMN request_id TYPE VARCHAR(100) USING request_id::text;
ALTER TABLE tool_invocations ALTER COLUMN request_id TYPE VARCHAR(100) USING request_id::text;
