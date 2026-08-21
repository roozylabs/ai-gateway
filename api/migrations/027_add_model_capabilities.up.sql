-- Migration 027: Add model capability columns for Semantic Router

ALTER TABLE models ADD COLUMN context_window INTEGER DEFAULT 0;
ALTER TABLE models ADD COLUMN coding_score NUMERIC(3,2) DEFAULT 0;
ALTER TABLE models ADD COLUMN reasoning_score NUMERIC(3,2) DEFAULT 0;
ALTER TABLE models ADD COLUMN writing_score NUMERIC(3,2) DEFAULT 0;
ALTER TABLE models ADD COLUMN speed_score NUMERIC(3,2) DEFAULT 0;
ALTER TABLE models ADD COLUMN quality_score NUMERIC(3,2) DEFAULT 0;
ALTER TABLE models ADD COLUMN input_price_per_1m NUMERIC(10,6) DEFAULT 0;
ALTER TABLE models ADD COLUMN output_price_per_1m NUMERIC(10,6) DEFAULT 0;
ALTER TABLE models ADD COLUMN supports_tools BOOLEAN DEFAULT false;
ALTER TABLE models ADD COLUMN supports_vision BOOLEAN DEFAULT false;

-- Seed capability scores for existing models
-- OpenAI
UPDATE models SET context_window = 128000, coding_score = 0.88, reasoning_score = 0.85, writing_score = 0.87,
    speed_score = 0.82, quality_score = 0.90, input_price_per_1m = 2.50, output_price_per_1m = 10.00,
    supports_tools = true, supports_vision = true
WHERE slug = 'gpt-4o';

UPDATE models SET context_window = 128000, coding_score = 0.75, reasoning_score = 0.70, writing_score = 0.78,
    speed_score = 0.92, quality_score = 0.72, input_price_per_1m = 0.15, output_price_per_1m = 0.60,
    supports_tools = true, supports_vision = true
WHERE slug = 'gpt-4o-mini';

-- Anthropic
UPDATE models SET context_window = 200000, coding_score = 0.95, reasoning_score = 0.92, writing_score = 0.90,
    speed_score = 0.78, quality_score = 0.93, input_price_per_1m = 3.00, output_price_per_1m = 15.00,
    supports_tools = true, supports_vision = false
WHERE slug = 'claude-sonnet';

UPDATE models SET context_window = 200000, coding_score = 0.72, reasoning_score = 0.65, writing_score = 0.75,
    speed_score = 0.95, quality_score = 0.70, input_price_per_1m = 0.80, output_price_per_1m = 4.00,
    supports_tools = true, supports_vision = false
WHERE slug = 'claude-haiku';

-- Google
UPDATE models SET context_window = 2000000, coding_score = 0.85, reasoning_score = 0.88, writing_score = 0.86,
    speed_score = 0.80, quality_score = 0.88, input_price_per_1m = 1.25, output_price_per_1m = 5.00,
    supports_tools = true, supports_vision = true
WHERE slug = 'gemini-pro';

UPDATE models SET context_window = 1000000, coding_score = 0.65, reasoning_score = 0.60, writing_score = 0.70,
    speed_score = 0.97, quality_score = 0.65, input_price_per_1m = 0.075, output_price_per_1m = 0.30,
    supports_tools = true, supports_vision = true
WHERE slug = 'gemini-flash';

-- OpenCode (free tier)
UPDATE models SET context_window = 200000, coding_score = 0.90, reasoning_score = 0.88, writing_score = 0.85,
    speed_score = 0.85, quality_score = 0.92, input_price_per_1m = 0.00, output_price_per_1m = 0.00,
    supports_tools = true, supports_vision = false
WHERE slug = 'big-pickle';

UPDATE models SET context_window = 1000000, coding_score = 0.65, reasoning_score = 0.60, writing_score = 0.70,
    speed_score = 0.97, quality_score = 0.65, input_price_per_1m = 0.00, output_price_per_1m = 0.00,
    supports_tools = true, supports_vision = true
WHERE slug = 'gemini-3.6-flash';
