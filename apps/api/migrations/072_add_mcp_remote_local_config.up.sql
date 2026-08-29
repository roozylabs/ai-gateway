-- Add remote/local MCP config columns (type, encrypted headers, command, args, env)
ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS config_type VARCHAR(20) NOT NULL DEFAULT 'remote';
ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS headers_encrypted TEXT;
ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS command TEXT;
ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS args TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS env JSONB NOT NULL DEFAULT '{}';
