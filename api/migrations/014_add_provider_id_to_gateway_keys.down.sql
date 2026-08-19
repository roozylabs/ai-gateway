DROP INDEX IF EXISTS idx_gateway_api_keys_provider_id;
ALTER TABLE gateway_api_keys DROP COLUMN IF EXISTS provider_id;
