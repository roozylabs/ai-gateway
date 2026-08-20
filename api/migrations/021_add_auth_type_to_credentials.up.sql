-- Add auth_type column (default 'api_key' for backward compatibility)
ALTER TABLE credentials
  ADD COLUMN auth_type VARCHAR(30) DEFAULT 'api_key'
  CHECK (auth_type IN ('api_key', 'gcp_user_oauth', 'gcp_service_account'));

-- Add encrypted_metadata for storing JSON OAuth credentials (client_id, client_secret, refresh_token)
ALTER TABLE credentials
  ADD COLUMN encrypted_metadata TEXT;
