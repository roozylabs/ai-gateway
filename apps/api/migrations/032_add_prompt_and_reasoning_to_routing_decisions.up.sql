ALTER TABLE routing_decisions ADD COLUMN IF NOT EXISTS prompt_preview TEXT;
ALTER TABLE routing_decisions ADD COLUMN IF NOT EXISTS scores_breakdown JSONB;
