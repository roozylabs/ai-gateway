export const resourcesKeys = {
  all: (tenantId?: string) => ['resources', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...resourcesKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...resourcesKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...resourcesKeys.all(tenantId), 'detail', id] as const,
};
