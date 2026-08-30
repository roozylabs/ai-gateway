export interface ApiDashboardStats {
  totalRequests: number;
  totalTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  totalEstimatedCost?: number;
  avgLatency: number;
  errorRate: number;
  activeProviders: number;
  activeCredentials: number;
  activeKeys: number;
}

export interface ApiUsagePoint {
  date: string;
  model?: string;
  requests: number;
  tokens: number;
  estimatedCost?: number;
}

export interface ApiProviderHealth {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'down';
  credCount: number;
}

export interface ApiActiveStreams {
  totalActive: number;
  byModel: Record<string, number>;
  byCredential?: Record<string, number>;
}
