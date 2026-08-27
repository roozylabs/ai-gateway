export const providersKeys = {
  all: (tenantId?: string) => ['providers', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...providersKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...providersKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...providersKeys.all(tenantId), 'detail', id] as const,
  health: (id: string, tenantId?: string) => [...providersKeys.all(tenantId), 'health', id] as const,
};
