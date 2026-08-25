-- down
DELETE FROM mcp_servers WHERE name IN ('github-mcp-server', 'notion-mcp-server');
