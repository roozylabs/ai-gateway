-- 1. Update providers.type constraint to include opencode, groq, deepseek
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_type_check;
ALTER TABLE providers ADD CONSTRAINT providers_type_check 
  CHECK (type IN ('openai', 'anthropic', 'google', 'openrouter', 'opencode', 'groq', 'deepseek'));

-- 2. Add providers.routing_strategy constraint
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_routing_strategy_check;
ALTER TABLE providers ADD CONSTRAINT providers_routing_strategy_check 
  CHECK (routing_strategy IN ('round_robin', 'lru', 'fallback'));

-- 3. Update credentials.status constraint
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_status_check;
ALTER TABLE credentials ADD CONSTRAINT credentials_status_check 
  CHECK (status IN ('active', 'rate_limited', 'invalid', 'disabled'));

-- 4. Update credentials.auth_type constraint to include V2 Roadmap types
ALTER TABLE credentials DROP CONSTRAINT IF EXISTS credentials_auth_type_check;
ALTER TABLE credentials ADD CONSTRAINT credentials_auth_type_check 
  CHECK (auth_type IN ('api_key', 'gcp_user_oauth', 'gcp_service_account', 'azure_oauth', 'aws_iam', 'github_oauth'));

-- 5. Add settings.category constraint
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_category_check;
ALTER TABLE settings ADD CONSTRAINT settings_category_check 
  CHECK (category IN ('general', 'security', 'routing', 'billing', 'currency'));
