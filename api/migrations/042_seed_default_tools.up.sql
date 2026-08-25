-- up
-- Seed default tools for initial user / admin
DO $$
DECLARE
  v_user_id VARCHAR := 'user_admin';
  v_tool_search_id UUID := gen_random_uuid();
  v_tool_code_id UUID := gen_random_uuid();
BEGIN
  -- 1. Seed search_web tool
  INSERT INTO tools (id, user_id, name, display_name, description, input_schema, enabled)
  VALUES (
    v_tool_search_id,
    v_user_id,
    'search_web',
    'Web Search Engine',
    'Executes real-time web queries across web search providers with automatic fallback.',
    '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query text"}}, "required": ["query"]}'::jsonb,
    true
  ) ON CONFLICT DO NOTHING;

  -- Backends for search_web
  INSERT INTO tool_backends (tool_id, name, backend_type, endpoint_url, auth_header_name, auth_header_prefix, timeout_ms, priority, enabled)
  VALUES 
    (v_tool_search_id, 'Tavily Search API', 'http', 'https://api.tavily.com/search', 'Authorization', 'Bearer ', 10000, 1, true),
    (v_tool_search_id, 'DuckDuckGo Scraper Engine', 'http', 'https://html.duckduckgo.com/html', 'Authorization', 'Bearer ', 15000, 2, true)
  ON CONFLICT DO NOTHING;

  -- 2. Seed execute_code tool
  INSERT INTO tools (id, user_id, name, display_name, description, input_schema, enabled)
  VALUES (
    v_tool_code_id,
    v_user_id,
    'execute_code',
    'Code Sandbox Execution Engine',
    'Executes Python, JavaScript, and shell code safely in isolated execution environments.',
    '{"type": "object", "properties": {"language": {"type": "string", "description": "Programming language"}, "code": {"type": "string", "description": "Source code to run"}}, "required": ["language", "code"]}'::jsonb,
    true
  ) ON CONFLICT DO NOTHING;

  -- Backends for execute_code
  INSERT INTO tool_backends (tool_id, name, backend_type, endpoint_url, auth_header_name, auth_header_prefix, timeout_ms, priority, enabled)
  VALUES 
    (v_tool_code_id, 'Piston Code Execution Sandbox', 'http', 'https://emkc.org/api/v2/piston/execute', 'Authorization', 'Bearer ', 10000, 1, true)
  ON CONFLICT DO NOTHING;
END $$;
