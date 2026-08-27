export const budgetsKeys = {
  all: (tenantId?: string) => ['budgets', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...budgetsKeys.all(tenantId), 'list'] as const,
  detail: (id: string, tenantId?: string) => [...budgetsKeys.all(tenantId), 'detail', id] as const,
};
