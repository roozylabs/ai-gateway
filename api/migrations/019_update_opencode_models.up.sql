-- Add big-pickle to opencode-zen
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'big-pickle', 'big-pickle', 'Big Pickle')
ON CONFLICT (provider_id, slug) DO NOTHING;
