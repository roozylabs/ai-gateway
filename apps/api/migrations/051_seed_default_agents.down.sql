-- down
DELETE FROM agents WHERE name IN ('dev-agent', 'research-agent');
