export const auditKeys = {
  all: (tenantId?: string) => ['audit-trail', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...auditKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...auditKeys.lists(tenantId), filters] as const,
};
