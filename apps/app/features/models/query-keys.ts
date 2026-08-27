export const modelsKeys = {
  all: (tenantId?: string) => ['models', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...modelsKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, providerId?: string) => [...modelsKeys.lists(tenantId), { providerId }] as const,
  detail: (id: string, tenantId?: string) => [...modelsKeys.all(tenantId), 'detail', id] as const,
};
