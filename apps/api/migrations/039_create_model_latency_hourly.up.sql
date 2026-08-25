-- up
CREATE TABLE IF NOT EXISTS model_latency_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR(255) NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  avg_ttft_ms NUMERIC(8,2),
  avg_latency_ms NUMERIC(8,2),
  p95_latency_ms NUMERIC(8,2),
  sample_count INT,
  success_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_latency_hourly_unique ON model_latency_hourly(model_slug, hour_start);
