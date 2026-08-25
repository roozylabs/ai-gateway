CREATE TABLE routing_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    weights JSONB NOT NULL DEFAULT '{}',
    constraints JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Seed default policies for admin user
INSERT INTO routing_policies (user_id, name, weights, constraints) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cheap',
  '{"task_match": 0.25, "quality": 0.10, "cost": 0.60, "speed": 0.05}',
  '{"max_cost_per_request": 0.01}'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'balanced',
  '{"task_match": 0.35, "quality": 0.35, "cost": 0.15, "speed": 0.15}',
  '{"max_cost_per_request": 0.05}'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'quality',
  '{"task_match": 0.35, "quality": 0.50, "cost": 0.05, "speed": 0.10}',
  '{"max_cost_per_request": 0.20}');
