export const logsKeys = {
  all: (tenantId?: string) => ['logs', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...logsKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...logsKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...logsKeys.all(tenantId), 'detail', id] as const,
};
