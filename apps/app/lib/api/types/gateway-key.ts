export interface ApiGatewayKey {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey?: string;
  apiKey?: string;
  providerId?: string;
  rateLimit: number;
  rateLimitWindow?: string;
  budgetLimitMonthly?: number;
  currentSpendMonthly?: number;
  requestCount?: number;
  allowedModels?: string[];
  allowedProviders?: string[];
  enabled: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}
