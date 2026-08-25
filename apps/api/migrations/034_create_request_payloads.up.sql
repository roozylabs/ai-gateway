CREATE TABLE request_payloads (
    request_id UUID PRIMARY KEY,
    gateway_api_key_id UUID,
    messages JSONB NOT NULL,
    prompt_hash CHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_request_payloads_created_at ON request_payloads(created_at);
