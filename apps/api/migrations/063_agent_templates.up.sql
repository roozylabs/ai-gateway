CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'bot',
    allowed_models JSONB DEFAULT '[]'::jsonb,
    allowed_tools JSONB DEFAULT '[]'::jsonb,
    allowed_resources JSONB DEFAULT '[]'::jsonb,
    max_budget_cents INT DEFAULT 5000,
    is_preset BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_templates_slug ON agent_templates(slug);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_preset ON agent_templates(is_preset);

-- Seed default agent templates
INSERT INTO agent_templates (
    id, name, slug, role, description, icon, allowed_models, allowed_tools, allowed_resources, max_budget_cents, is_preset
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Software Engineer Agent',
    'software-engineer',
    'developer',
    'Autonomous coding agent for feature implementation, code review, and bug fixes.',
    'code',
    '["gpt-4o", "claude-3-7-sonnet", "prism-auto"]'::jsonb,
    '["git", "bash", "read_file", "write_file"]'::jsonb,
    '[]'::jsonb,
    10000,
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    'DevOps Specialist Agent',
    'devops-specialist',
    'devops',
    'Infrastructure automation agent for Docker, Kubernetes, and CI/CD pipeline management.',
    'cloud',
    '["gpt-4o", "gemini-1.5-pro", "prism-auto"]'::jsonb,
    '["docker", "kubectl", "bash", "aws_cli"]'::jsonb,
    '[]'::jsonb,
    15000,
    true
),
(
    '33333333-3333-3333-3333-333333333333',
    'QA Automation Engineer Agent',
    'qa-automation-engineer',
    'qa',
    'Test automation agent for end-to-end regression testing and bug report generation.',
    'bug',
    '["claude-3-5-haiku", "gpt-4o-mini", "prism-auto"]'::jsonb,
    '["cypress", "playwright", "read_file"]'::jsonb,
    '[]'::jsonb,
    5000,
    true
),
(
    '44444444-4444-4444-4444-444444444444',
    'Data Analyst Agent',
    'data-analyst',
    'analyst',
    'Data exploration agent for relational SQL querying, analytics, and reporting.',
    'bar-chart',
    '["gpt-4o", "gemini-1.5-pro", "prism-auto"]'::jsonb,
    '[]'::jsonb,
    '["postgresql", "clickhouse", "analytics_db"]'::jsonb,
    8000,
    true
)
ON CONFLICT (slug) DO NOTHING;
