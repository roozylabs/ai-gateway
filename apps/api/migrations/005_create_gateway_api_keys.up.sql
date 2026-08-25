CREATE TABLE gateway_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    rate_limit INTEGER DEFAULT 100,
    allowed_models TEXT[],
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    request_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gateway_api_keys_user_id ON gateway_api_keys(user_id);
CREATE INDEX idx_gateway_api_keys_key_hash ON gateway_api_keys(key_hash);
CREATE INDEX idx_gateway_api_keys_enabled ON gateway_api_keys(enabled);
