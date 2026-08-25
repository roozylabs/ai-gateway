-- up
INSERT INTO resources (id, user_id, name, display_name, description, enabled)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'user_admin',
  'get_customer',
  'Enterprise CRM Data Resource',
  'Resolves customer profiles dynamically from CRM REST API endpoints.',
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO resource_backends (resource_id, name, backend_type, endpoint_url, http_method, timeout_ms, priority, enabled)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Salesforce / HubSpot CRM API',
  'rest',
  'https://api.crm.internal/v1/customers',
  'GET',
  10000,
  1,
  true
) ON CONFLICT DO NOTHING;

INSERT INTO resources (id, user_id, name, display_name, description, enabled)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'user_admin',
  'query_analytics_db',
  'Relational PostgreSQL Analytics DB',
  'Queries enterprise user and transaction records directly from Postgres database.',
  true
) ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO resource_backends (resource_id, name, backend_type, query_template, param_names, timeout_ms, priority, enabled)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'PostgreSQL Primary Cluster',
  'postgres',
  'SELECT id, email, name, plan FROM users WHERE id = $1',
  ARRAY['id'],
  10000,
  1,
  true
) ON CONFLICT DO NOTHING;
