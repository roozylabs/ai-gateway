export const toolsKeys = {
  all: (tenantId?: string) => ['tools', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...toolsKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...toolsKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...toolsKeys.all(tenantId), 'detail', id] as const,
};
