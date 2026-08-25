ALTER TABLE routing_policies ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
UPDATE routing_policies SET is_default = true WHERE name = 'balanced';
