ALTER TABLE request_logs 
  DROP COLUMN IF EXISTS ttft_ms,
  DROP COLUMN IF EXISTS is_stream,
  DROP COLUMN IF EXISTS client_app,
  DROP COLUMN IF EXISTS user_agent,
  DROP COLUMN IF EXISTS client_ip;
