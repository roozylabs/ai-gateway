-- OpenCode Go provider ($10/month subscription)
INSERT INTO providers (id, user_id, name, slug, base_url, type, enabled, routing_strategy)
VALUES (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'OpenCode Go',
    'opencode-go',
    'https://opencode.ai/zen/go',
    'opencode',
    true,
    'round_robin'
) ON CONFLICT (id) DO NOTHING;

-- OpenCode Go models (open-source only)
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deepseek-v4-pro',     'deepseek-v4-pro',     'DeepSeek V4 Pro'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deepseek-v4-flash',   'deepseek-v4-flash',   'DeepSeek V4 Flash'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'kimi-k3',             'kimi-k3',             'Kimi K3'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'kimi-k2.7-code',      'kimi-k2.7-code',      'Kimi K2.7 Code'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'glm-5.2',             'glm-5.2',             'GLM 5.2'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'glm-5.3',             'glm-5.3',             'GLM 5.3'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'qwen3.7-plus',        'qwen3.7-plus',        'Qwen3.7 Plus'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'qwen3.8-max',         'qwen3.8-max',         'Qwen3.8 Max'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'minimax-m3',          'minimax-m3',          'MiniMax M3'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'minimax-m2.7',        'minimax-m2.7',        'MiniMax M2.7'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-5.6-luna',        'gpt-5.6-luna',        'GPT 5.6 Luna'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'grok-4.5',            'grok-4.5',            'Grok 4.5'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'mimo-v2.5',           'mimo-v2.5',           'MiMo V2.5'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'muse-spark-1.2',      'muse-spark-1.2',      'Muse Spark 1.2'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'hy3',                 'hy3',                 'Hy3')
ON CONFLICT (provider_id, slug) DO NOTHING;
