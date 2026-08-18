CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    model_pattern VARCHAR(255) NOT NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routing_rules_user_id ON routing_rules(user_id);
CREATE INDEX idx_routing_rules_model_pattern ON routing_rules(model_pattern);
CREATE INDEX idx_routing_rules_priority ON routing_rules(priority);
