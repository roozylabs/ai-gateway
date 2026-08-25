-- up
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  description TEXT,
  parameters_schema JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_resources_user_name ON resources(user_id, name);
CREATE INDEX idx_resources_user_id ON resources(user_id);

-- down
DROP TABLE resources;
