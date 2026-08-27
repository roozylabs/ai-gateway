export const agentsKeys = {
  all: (tenantId?: string) => ['agents', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...agentsKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...agentsKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...agentsKeys.all(tenantId), 'detail', id] as const,
};
