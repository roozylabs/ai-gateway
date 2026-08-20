-- 024_seed_opencode_free_models.up.sql
-- Seed free models for OpenCode Zen provider

INSERT INTO models (provider_id, name, slug, display_name, enabled) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'mimo-v2.5-free', 'mimo-v2.5-free', 'MiMo-V2.5 Free', true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'deepseek-v4-flash-free', 'deepseek-v4-flash-free', 'DeepSeek V4 Flash Free', true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'nemotron-3-ultra-free', 'nemotron-3-ultra-free', 'Nemotron 3 Ultra Free', true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'nemotron-3.5-lightning-free', 'nemotron-3.5-lightning-free', 'Nemotron 3.5 Lightning Free', true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'hy3-free', 'hy3-free', 'Hy3 Free', true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'laguna-s-2.1-free', 'laguna-s-2.1-free', 'Laguna S 2.1 Free', true)
ON CONFLICT (provider_id, slug) DO UPDATE SET 
    name = EXCLUDED.name, 
    display_name = EXCLUDED.display_name,
    enabled = true;
