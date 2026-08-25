-- 024_seed_opencode_free_models.down.sql
DELETE FROM models WHERE provider_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
AND slug IN (
    'mimo-v2.5-free',
    'deepseek-v4-flash-free',
    'nemotron-3-ultra-free',
    'nemotron-3.5-lightning-free',
    'hy3-free',
    'laguna-s-2.1-free'
);
