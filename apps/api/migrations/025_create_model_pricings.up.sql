CREATE TABLE model_pricings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_slug VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    prompt_price_per_1m NUMERIC(10, 6) NOT NULL,
    completion_price_per_1m NUMERIC(10, 6) NOT NULL,
    cached_prompt_price_per_1m NUMERIC(10, 6) DEFAULT 0,
    effective_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_slug, provider_type)
);

CREATE INDEX idx_model_pricings_slug ON model_pricings(model_slug);
CREATE INDEX idx_model_pricings_provider ON model_pricings(provider_type);

-- Seed initial pricing (approximate rates as of Aug 2026)
INSERT INTO model_pricings (model_slug, provider_type, prompt_price_per_1m, completion_price_per_1m) VALUES
-- OpenAI
('gpt-4o', 'openai', 2.50, 10.00),
('gpt-4o-mini', 'openai', 0.15, 0.60),
('gpt-4-turbo', 'openai', 10.00, 30.00),
('o1', 'openai', 15.00, 60.00),
('o1-mini', 'openai', 3.00, 12.00),
('o1-pro', 'openai', 150.00, 600.00),
-- Anthropic
('claude-sonnet-4-20250514', 'anthropic', 3.00, 15.00),
('claude-3-5-haiku-20241022', 'anthropic', 0.80, 4.00),
('claude-3-opus-20240229', 'anthropic', 15.00, 75.00),
-- Google
('gemini-1.5-pro', 'google', 1.25, 5.00),
('gemini-1.5-flash', 'google', 0.075, 0.30),
('gemini-2.0-flash', 'google', 0.10, 0.40),
('gemini-2.5-flash', 'google', 0.15, 0.60),
('gemini-2.5-pro', 'google', 1.25, 10.00),
('gemini-3.6-flash', 'google', 0.15, 0.60),
-- OpenCode (free tier)
('big-pickle', 'opencode', 0.00, 0.00),
('gemini-3.6-flash', 'opencode', 0.00, 0.00);
