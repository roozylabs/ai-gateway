-- Default admin user
INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Admin',
    'admin@aigateway.dev',
    true,
    NOW(),
    NOW()
);

-- Admin credential account (password: admin123)
INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
VALUES (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@aigateway.dev',
    'credential',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '$2a$10$B4tTaU1XK2DVIoKX2.hE/uKyVtjyV83kJPVZSm/NQTrziUIStM776',
    NOW(),
    NOW()
);

-- Default providers
INSERT INTO providers (id, user_id, name, slug, base_url, type) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'OpenAI', 'openai', 'https://api.openai.com', 'openai'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Anthropic', 'anthropic', 'https://api.anthropic.com', 'anthropic'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Google', 'google', 'https://generativelanguage.googleapis.com', 'google');

-- Default models
INSERT INTO models (provider_id, name, slug, display_name) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-4o', 'gpt-4o', 'GPT-4o'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gpt-4o-mini', 'gpt-4o-mini', 'GPT-4o Mini'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'claude-sonnet-4-20250514', 'claude-sonnet', 'Claude Sonnet 4'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'claude-3-5-haiku-20241022', 'claude-haiku', 'Claude 3.5 Haiku'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-1.5-pro', 'gemini-pro', 'Gemini 1.5 Pro'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'gemini-1.5-flash', 'gemini-flash', 'Gemini 1.5 Flash');
