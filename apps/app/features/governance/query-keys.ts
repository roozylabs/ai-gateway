export const governanceKeys = {
  all: (tenantId?: string) => ['governance-policies', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...governanceKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...governanceKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...governanceKeys.all(tenantId), 'detail', id] as const,
};
