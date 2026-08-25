-- Reset any credentials accidentally marked invalid during gateway route testing
UPDATE credentials SET status = 'active' WHERE status = 'invalid';
