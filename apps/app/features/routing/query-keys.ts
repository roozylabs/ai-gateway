export const policiesKeys = {
  all: (tenantId?: string) => ['policies', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...policiesKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...policiesKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...policiesKeys.all(tenantId), 'detail', id] as const,
};
