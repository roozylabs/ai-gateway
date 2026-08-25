-- OpenCode Zen provider
INSERT INTO providers (id, user_id, name, slug, base_url, type, enabled, routing_strategy)
VALUES (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'OpenCode Zen',
    'opencode-zen',
    'https://opencode.ai/zen',
    'opencode',
    true,
    'round_robin'
) ON CONFLICT (id) DO NOTHING;

-- Default OpenCode models
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deepseek-v4-pro',     'deepseek-v4-pro',     'DeepSeek V4 Pro'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deepseek-v4-flash',   'deepseek-v4-flash',   'DeepSeek V4 Flash'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'kimi-k3',             'kimi-k3',             'Kimi K3'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'kimi-k2.7-code',      'kimi-k2.7-code',      'Kimi K2.7 Code'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'glm-5.2',             'glm-5.2',             'GLM 5.2'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'qwen3.7-plus',        'qwen3.7-plus',        'Qwen3.7 Plus'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'minimax-m3',          'minimax-m3',          'MiniMax M3'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-5.6-luna',        'gpt-5.6-luna',        'GPT 5.6 Luna'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'claude-sonnet-5',     'claude-sonnet-5',     'Claude Sonnet 5'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'grok-4.5',            'grok-4.5',            'Grok 4.5')
ON CONFLICT (provider_id, slug) DO NOTHING;
