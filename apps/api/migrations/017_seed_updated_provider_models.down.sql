DELETE FROM models WHERE slug IN (
    'gpt-4-turbo', 'o1', 'o3-mini',
    'claude-3-7-sonnet', 'claude-3-5-sonnet',
    'gemini-2.0-flash', 'gemini-2.0-pro'
);
