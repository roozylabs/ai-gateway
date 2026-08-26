export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum PermissionSlug {
  CREDENTIALS_READ = 'credentials:read',
  CREDENTIALS_WRITE = 'credentials:write',
  MODELS_READ = 'models:read',
  MODELS_WRITE = 'models:write',
  POLICIES_READ = 'policies:read',
  POLICIES_WRITE = 'policies:write',
  GATEWAY_KEYS_WRITE = 'gateway_keys:write',
  AUDIT_EXPORT = 'audit:export',
  BILLING_MANAGE = 'billing:manage',
  GOVERNANCE_MANAGE = 'governance:manage',
}
