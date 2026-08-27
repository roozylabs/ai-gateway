export const credentialsKeys = {
  all: (tenantId?: string) => ['credentials', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...credentialsKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, providerId?: string) => [...credentialsKeys.lists(tenantId), { providerId }] as const,
  detail: (id: string, tenantId?: string) => [...credentialsKeys.all(tenantId), 'detail', id] as const,
};
