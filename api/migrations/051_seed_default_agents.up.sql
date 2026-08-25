-- up
INSERT INTO agents (id, user_id, name, display_name, description, agent_type, system_prompt_override, allowed_models, allowed_tools, allowed_resources, enabled)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  'user_admin',
  'dev-agent',
  'Software Engineer Agent',
  'Autonomous developer agent specialized in code refactoring, bug fixes, and system integration.',
  'developer',
  'You are an expert senior software engineer. Write clean, robust, and well-tested code following repository standards.',
  ARRAY['gpt-4o', 'claude-sonnet', 'gemini-pro'],
  ARRAY['execute_code', 'search_web'],
  ARRAY['query_analytics_db'],
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO agents (id, user_id, name, display_name, description, agent_type, system_prompt_override, allowed_models, allowed_tools, allowed_resources, enabled)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  'user_admin',
  'research-agent',
  'Market & Tech Research Agent',
  'Research assistant agent focused on synthesizing technical papers, web search, and data analytics.',
  'researcher',
  'You are a precise technical research analyst. Provide well-cited, objective summaries of complex topics.',
  ARRAY['gpt-4o-mini', 'claude-haiku', 'gemini-flash'],
  ARRAY['search_web'],
  ARRAY['get_customer'],
  true
) ON CONFLICT (user_id, name) DO NOTHING;
