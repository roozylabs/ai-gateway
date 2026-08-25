-- down
UPDATE account 
SET password = '$2b$10$/OtX5REQdPx7SYXIj6vdFOAvAik5SBcXwmSr1iUs3OVWeBLWej1Ge', "updatedAt" = NOW()
WHERE "accountId" = 'admin@roozylabs.com';
