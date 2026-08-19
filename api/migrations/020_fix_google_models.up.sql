-- Fix Google Gemini model upstream names to point to valid official active Google model (gemini-3.6-flash & gemini-3.7-flash)
UPDATE models 
SET name = 'gemini-3.6-flash' 
WHERE provider_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Ensure default seeded Google models exist with correct upstream names
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-3.6-flash', 'gemini-3.6-flash', 'Gemini 3.6 Flash'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-3.7-flash', 'gemini-3.7-flash', 'Gemini 3.7 Flash'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-3.6-flash', 'gemini-2.0-flash', 'Gemini 2.0 Flash'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-3.6-flash', 'gemini-2.0-pro',   'Gemini 2.0 Pro'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-3.6-flash', 'gemini-1.5-flash', 'Gemini 1.5 Flash'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-3.6-flash', 'gemini-1.5-pro',   'Gemini 1.5 Pro')
ON CONFLICT (provider_id, slug) DO UPDATE SET name = EXCLUDED.name, display_name = EXCLUDED.display_name;
