-- up
CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL,
  usage_percent NUMERIC(6,2),
  monthly_spent NUMERIC(12,4),
  monthly_limit NUMERIC(12,4),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_alerts_dedupe ON budget_alerts(budget_id, alert_type, (created_at::date));
