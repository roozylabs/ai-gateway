-- up
INSERT INTO governance_policies (id, user_id, name, description, role, effect, agent_pattern, model_pattern, tool_pattern, resource_pattern, priority, enabled)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'user_admin',
  'Developer Full Access Policy',
  'Allows developers full execution access to general tools, resources, and coding models.',
  'developer',
  'allow',
  'dev-*',
  '*',
  '*',
  '*',
  100,
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO governance_policies (id, user_id, name, description, role, effect, agent_pattern, model_pattern, tool_pattern, resource_pattern, priority, enabled)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'user_admin',
  'Deny Developer Cross-Domain Payroll Access',
  'Strict security guardrail: explicitly denies developer agents from accessing finance or payroll database resources.',
  'developer',
  'deny',
  'dev-*',
  '*',
  '*',
  '*payroll*',
  1,
  true
) ON CONFLICT (user_id, name) DO NOTHING;
