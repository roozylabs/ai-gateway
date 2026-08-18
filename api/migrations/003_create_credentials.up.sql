CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'rate_limited', 'invalid', 'disabled')),
    last_used_at TIMESTAMPTZ,
    request_count BIGINT DEFAULT 0,
    error_count BIGINT DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credentials_provider_id ON credentials(provider_id);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credentials_enabled ON credentials(enabled);
CREATE INDEX idx_credentials_priority ON credentials(priority);
CREATE INDEX idx_credentials_provider_status ON credentials(provider_id, status);
CREATE INDEX idx_credentials_provider_enabled ON credentials(provider_id, enabled);
