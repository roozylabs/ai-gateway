ALTER TABLE gateway_api_keys ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_gateway_api_keys_provider_id ON gateway_api_keys(provider_id);
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_type_check;
ALTER TABLE models DROP CONSTRAINT IF EXISTS models_slug_key;
ALTER TABLE models ADD CONSTRAINT models_provider_id_slug_key UNIQUE (provider_id, slug);
