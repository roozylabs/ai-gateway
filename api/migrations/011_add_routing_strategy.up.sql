ALTER TABLE providers ADD COLUMN IF NOT EXISTS routing_strategy VARCHAR(50) DEFAULT 'round_robin';
