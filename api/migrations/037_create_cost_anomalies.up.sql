-- up
CREATE TABLE cost_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start TIMESTAMPTZ NOT NULL,
  metric VARCHAR(50) NOT NULL,
  observed NUMERIC(12,4) NOT NULL,
  baseline_mean NUMERIC(12,4),
  baseline_stddev NUMERIC(12,4),
  z_score NUMERIC(8,2),
  severity VARCHAR(20) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cost_anomalies_created_at ON cost_anomalies(created_at);

-- down
DROP TABLE cost_anomalies;
