CREATE TABLE tool_invocations (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  call_id TEXT,
  arguments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_invocations_request_id ON tool_invocations(request_id);
