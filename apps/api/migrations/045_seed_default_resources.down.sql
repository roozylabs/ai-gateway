-- down
DELETE FROM resources WHERE name IN ('get_customer', 'query_analytics_db');
