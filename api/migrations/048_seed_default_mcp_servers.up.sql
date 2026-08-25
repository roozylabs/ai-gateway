-- up
INSERT INTO mcp_servers (id, user_id, name, display_name, description, transport_type, endpoint_url, status, enabled)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'user_admin',
  'github-mcp-server',
  'GitHub MCP Protocol Server',
  'Centralized Model Context Protocol server providing GitHub repository, pull request, and code management tools.',
  'http',
  'https://mcp.github.com/v1',
  'connected',
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO mcp_tools (mcp_server_id, name, description, input_schema, enabled)
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'create_issue', 'Creates a new issue in a GitHub repository', '{"type":"object","properties":{"repo":{"type":"string"},"title":{"type":"string"},"body":{"type":"string"}},"required":["repo","title"]}'::jsonb, true),
  ('55555555-5555-5555-5555-555555555555', 'list_pull_requests', 'Lists active pull requests in a GitHub repository', '{"type":"object","properties":{"repo":{"type":"string"},"state":{"type":"string"}},"required":["repo"]}'::jsonb, true)
ON CONFLICT DO NOTHING;

INSERT INTO mcp_servers (id, user_id, name, display_name, description, transport_type, endpoint_url, status, enabled)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'user_admin',
  'notion-mcp-server',
  'Notion Workspace MCP Server',
  'Centralized Model Context Protocol server providing Notion page search, document creation, and database tools.',
  'http',
  'https://mcp.notion.so/v1',
  'connected',
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO mcp_tools (mcp_server_id, name, description, input_schema, enabled)
VALUES 
  ('66666666-6666-6666-6666-666666666666', 'search_pages', 'Searches pages in Notion workspace', '{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}'::jsonb, true)
ON CONFLICT DO NOTHING;
