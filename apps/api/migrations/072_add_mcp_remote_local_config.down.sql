-- Rollback remote/local MCP config columns
ALTER TABLE mcp_servers DROP COLUMN IF EXISTS env;
ALTER TABLE mcp_servers DROP COLUMN IF EXISTS args;
ALTER TABLE mcp_servers DROP COLUMN IF EXISTS command;
ALTER TABLE mcp_servers DROP COLUMN IF EXISTS headers_encrypted;
ALTER TABLE mcp_servers DROP COLUMN IF EXISTS config_type;
