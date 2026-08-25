-- down
DELETE FROM governance_policies WHERE name IN ('Developer Full Access Policy', 'Deny Developer Cross-Domain Payroll Access');
