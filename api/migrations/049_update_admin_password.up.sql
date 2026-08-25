-- up
UPDATE account 
SET password = '$2a$10$Ch1gq.Y0s1c7aVp2vOEJt.zBhQ24kqC7kMqj2dt2o3qriBAlglyRi', "updatedAt" = NOW()
WHERE "accountId" = 'admin@roozylabs.com';
