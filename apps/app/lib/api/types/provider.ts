export interface ApiProvider {
  id: string;
  userId?: string;
  name: string;
  slug?: string;
  type: string;
  baseUrl?: string;
  enabled: boolean;
  priority: number;
  weight: number;
  isCustom?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCredentialQuota {
  remainingRequests?: number;
  limitRequests?: number;
  remainingTokens?: number;
  limitTokens?: number;
  resetDurationSec?: number;
  resetAt?: string;
  statusText?: string;
  lastUpdated?: number;
}

export interface ApiCredential {
  id: string;
  providerId: string;
  providerName?: string;
  name: string;
  keyPrefix: string;
  maskedKey?: string;
  apiKey?: string;
  authType?: string;
  metadata?: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  };
  priority: number;
  enabled: boolean;
  status: string;
  lastUsedAt?: string;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
  updatedAt: string;
  isCoolingDown?: boolean;
  cooldownTtl?: number;
  quota?: ApiCredentialQuota;
}

export interface ApiTestCredentialResult {
  success: boolean;
  latencyMs: number;
  httpStatus: number;
  error?: string;
  message?: string;
}
