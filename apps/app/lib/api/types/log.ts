export interface ApiRequestLog {
  id: string;
  requestId: string;
  gatewayKeyId?: string;
  providerId: string;
  providerName?: string;
  credentialId?: string;
  credentialName?: string;
  model: string;
  statusCode: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  estimatedCost?: number;
  errorMessage?: string;
  retryCount: number;
  clientIp?: string;
  userAgent?: string;
  clientApp?: string;
  isStream?: boolean;
  ttftMs?: number;
  routingStrategy?: string;
  createdAt: string;
}

export interface ApiClientAppStat {
  clientApp: string;
  requests: number;
  tokens: number;
  costUsd: number;
  errorRate: number;
}

export interface ApiModelStat {
  model: string;
  requests: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
  errorRate: number;
}

export interface ApiLogAnalytics {
  timeWindow: string;
  totalRequests: number;
  successRate: number;
  clientApps: ApiClientAppStat[];
  models: ApiModelStat[];
}
