CREATE TABLE routing_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    user_id TEXT NOT NULL,
    task_type VARCHAR(50),
    complexity VARCHAR(20),
    policy_name VARCHAR(100),
    candidates JSONB,
    selected_model VARCHAR(255),
    selected_provider VARCHAR(100),
    budget_status VARCHAR(20),
    estimated_cost NUMERIC(10,6) DEFAULT 0,
    actual_cost NUMERIC(10,6) DEFAULT 0,
    downgrade_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routing_decisions_user ON routing_decisions(user_id);
CREATE INDEX idx_routing_decisions_created ON routing_decisions(created_at);
CREATE INDEX idx_routing_decisions_request ON routing_decisions(request_id);
