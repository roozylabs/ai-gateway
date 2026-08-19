-- 019_update_opencode_models.down.sql
-- In a real down migration we might just delete models we know were purely added here,
-- but since we're bulk upserting, down could optionally remove all but the original models.
-- We'll delete the ones that were explicitly mentioned in 019 but not in 015/016 to be safe,
-- or just delete all of them except the ones in 015/016.

-- For simplicity, let's just delete 'big-pickle' and others that were definitely not in 015/016, 
-- or delete all these slugs then re-insert 015/016 models.
-- A simple way: delete the ones we are adding that are newly discovered.
DELETE FROM models WHERE provider_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND slug IN (
    'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.3-codex', 'gpt-5.3-codex-spark', 'gpt-5.2', 'gpt-5.2-codex', 'gpt-5.1', 'gpt-5.1-codex', 'gpt-5.1-codex-max', 'gpt-5.1-codex-mini', 'gpt-5', 'gpt-5-codex', 'gpt-5-nano',
    'claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-opus-4-5', 'claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5',
    'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro', 'gemini-3-flash',
    'grok-4.6', 'grok-build-0.1', 'muse-spark-1.2',
    'qwen3.7-max', 'qwen3.6-plus', 'qwen3.5-plus',
    'minimax-m2.7', 'minimax-m2.5', 'glm-5.1', 'glm-5', 'kimi-k2.5', 'kimi-k2.6',
    'big-pickle', 'mimo-v2.5-free', 'hy3-free', 'laguna-s-2.1-free', 'nemotron-3-ultra-free', 'nemotron-3.5-lightning-free', 'deepseek-v4-flash-free'
);

DELETE FROM models WHERE provider_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND slug IN (
    'kimi-k2.6', 'mimo-v2.5', 'mimo-v2.5-pro', 'minimax-m2.5', 'muse-spark-1.2-contributor', 'qwen3.7-max', 'qwen3.6-plus'
);
