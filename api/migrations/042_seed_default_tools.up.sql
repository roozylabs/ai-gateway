-- up
INSERT INTO tools (id, user_id, name, display_name, description, input_schema, enabled)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'user_admin',
  'search_web',
  'Web Search Engine',
  'Executes real-time web queries across web search providers with automatic fallback.',
  '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query text"}}, "required": ["query"]}'::jsonb,
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO tool_backends (tool_id, name, backend_type, endpoint_url, auth_header_name, auth_header_prefix, timeout_ms, priority, enabled)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Tavily Search API', 'http', 'https://api.tavily.com/search', 'Authorization', 'Bearer ', 10000, 1, true),
  ('11111111-1111-1111-1111-111111111111', 'DuckDuckGo Scraper Engine', 'http', 'https://html.duckduckgo.com/html', 'Authorization', 'Bearer ', 15000, 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO tools (id, user_id, name, display_name, description, input_schema, enabled)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'user_admin',
  'execute_code',
  'Code Sandbox Execution Engine',
  'Executes Python, JavaScript, and shell code safely in isolated execution environments.',
  '{"type": "object", "properties": {"language": {"type": "string", "description": "Programming language"}, "code": {"type": "string", "description": "Source code to run"}}, "required": ["language", "code"]}'::jsonb,
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO tool_backends (tool_id, name, backend_type, endpoint_url, auth_header_name, auth_header_prefix, timeout_ms, priority, enabled)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Piston Code Execution Sandbox', 'http', 'https://emkc.org/api/v2/piston/execute', 'Authorization', 'Bearer ', 10000, 1, true)
ON CONFLICT DO NOTHING;
