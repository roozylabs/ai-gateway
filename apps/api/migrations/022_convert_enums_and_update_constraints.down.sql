ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_category_check;
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_auth_type_check;
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_status_check;
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_routing_strategy_check;
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_type_check;

-- Re-apply original V1 constraint on providers.type
ALTER TABLE providers ADD CONSTRAINT providers_type_check 
  CHECK (type IN ('openai', 'anthropic', 'google', 'openrouter'));
