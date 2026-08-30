import { ApiModel } from './types/model';

/**
 * Universal Virtual Smart Router Model Constant
 * Automatically provisions client-side candidate routing fallback representations.
 */
export const GLOBAL_SMART_ROUTER_MODEL = 'prism-auto';

export const GLOBAL_SMART_ROUTER_ITEM: ApiModel = {
  id: 'prism-auto',
  providerId: 'prism',
  name: 'prism-auto',
  slug: 'prism-auto',
  displayName: 'prism-auto (Smart Routing)',
  enabled: true,
  providerName: 'Prism Intelligent Router',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export function prependSmartRouterModel(models: ApiModel[]): ApiModel[] {
  const hasSmartRouter = models.some((m) => m.id === GLOBAL_SMART_ROUTER_MODEL || m.name === GLOBAL_SMART_ROUTER_MODEL);
  if (!hasSmartRouter) {
    return [GLOBAL_SMART_ROUTER_ITEM, ...models];
  }
  return models;
}
