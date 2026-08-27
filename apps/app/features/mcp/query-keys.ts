export const mcpKeys = {
  all: (tenantId?: string) => ['mcp-servers', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...mcpKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...mcpKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...mcpKeys.all(tenantId), 'detail', id] as const,
};
