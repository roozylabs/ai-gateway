-- Additional official models for OpenAI (b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-4-turbo',    'gpt-4-turbo',    'GPT-4 Turbo'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'o1',             'o1',             'OpenAI o1'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'o3-mini',        'o3-mini',        'OpenAI o3-mini')
ON CONFLICT (provider_id, slug) DO NOTHING;

-- Additional official models for Anthropic (c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'claude-3-7-sonnet-20250219', 'claude-3-7-sonnet', 'Claude 3.7 Sonnet'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet', 'Claude 3.5 Sonnet')
ON CONFLICT (provider_id, slug) DO NOTHING;

-- Additional official models for Google (d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-1.5-flash',           'gemini-3.6-flash', 'Gemini 3.6 Flash'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-1.5-flash',           'gemini-2.0-flash', 'Gemini 2.0 Flash'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-1.5-pro',             'gemini-2.0-pro',   'Gemini 2.0 Pro')
ON CONFLICT (provider_id, slug) DO UPDATE SET name = EXCLUDED.name, display_name = EXCLUDED.display_name;
