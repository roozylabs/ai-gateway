export const gatewayKeysKeys = {
  all: (tenantId?: string) => ['gateway-keys', tenantId || 'default'] as const,
  lists: (tenantId?: string) => [...gatewayKeysKeys.all(tenantId), 'list'] as const,
  list: (tenantId?: string, filters?: Record<string, unknown>) => [...gatewayKeysKeys.lists(tenantId), filters] as const,
  detail: (id: string, tenantId?: string) => [...gatewayKeysKeys.all(tenantId), 'detail', id] as const,
};
