CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
    ('max_retries', '2'),
    ('cooldown_seconds', '60'),
    ('rate_limit_per_key', '100'),
    ('enable_auto_rotation', 'true')
ON CONFLICT (key) DO NOTHING;
