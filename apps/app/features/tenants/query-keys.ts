export const tenantsKeys = {
  all: ['tenants'] as const,
  organizations: () => [...tenantsKeys.all, 'organizations'] as const,
  workspaces: (orgId?: string) => [...tenantsKeys.all, 'workspaces', orgId || 'default'] as const,
  projects: (workspaceId?: string) => [...tenantsKeys.all, 'projects', workspaceId || 'default'] as const,
};
