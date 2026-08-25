CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    monthly_limit NUMERIC(10,2) DEFAULT 0,
    daily_limit NUMERIC(10,2) DEFAULT 0,
    hard_limit BOOLEAN DEFAULT true,
    warning_threshold NUMERIC(3,2) DEFAULT 0.80,
    critical_threshold NUMERIC(3,2) DEFAULT 0.90,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO budgets (user_id, name, monthly_limit, daily_limit, hard_limit, warning_threshold, critical_threshold)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Default Monthly Budget', 100.00, 10.00, true, 0.80, 0.90);
