ALTER TABLE gateway_api_keys ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_gateway_api_keys_provider_id ON gateway_api_keys(provider_id);
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_type_check;
