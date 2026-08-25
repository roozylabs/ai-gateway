-- up
-- Seed default resources for initial user / admin
DO $$
DECLARE
  v_user_id VARCHAR := 'user_admin';
  v_resource_crm_id UUID := gen_random_uuid();
  v_resource_db_id UUID := gen_random_uuid();
  v_endpoint_crm TEXT := 'https://api.crm.internal/v1/customers';
  v_query_db TEXT := 'SELECT id, email, name, plan FROM users WHERE id = $1';
BEGIN
  -- 1. Seed get_customer resource (REST)
  INSERT INTO resources (id, user_id, name, display_name, description, enabled)
  VALUES (
    v_resource_crm_id,
    v_user_id,
    'get_customer',
    'Enterprise CRM Data Resource',
    'Resolves customer profiles dynamically from CRM REST API endpoints.',
    true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO resource_backends (resource_id, name, backend_type, endpoint_url, http_method, timeout_ms, priority, enabled)
  VALUES (
    v_resource_crm_id,
    'Salesforce / HubSpot CRM API',
    'rest',
    v_endpoint_crm,
    'GET',
    10000,
    1,
    true
  ) ON CONFLICT DO NOTHING;

  -- 2. Seed query_analytics_db resource (PostgreSQL)
  INSERT INTO resources (id, user_id, name, display_name, description, enabled)
  VALUES (
    v_resource_db_id,
    v_user_id,
    'query_analytics_db',
    'Relational PostgreSQL Analytics DB',
    'Queries enterprise user and transaction records directly from Postgres database.',
    true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO resource_backends (resource_id, name, backend_type, query_template, parameter_names, timeout_ms, priority, enabled)
  VALUES (
    v_resource_db_id,
    'PostgreSQL Primary Cluster',
    'postgres',
    v_query_db,
    '{"id"}',
    10000,
    1,
    true
  ) ON CONFLICT DO NOTHING;
END $$;
