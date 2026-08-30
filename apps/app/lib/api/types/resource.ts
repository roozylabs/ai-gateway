export interface ApiResource {
  id: string;
  name: string;
  displayName: string;
  description: string;
  resourceUri: string;
  mimeType: string;
  enabled: boolean;
  cacheTtlSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResourceBackend {
  id: string;
  resourceId: string;
  name: string;
  backendType: 'postgres' | 'http' | 's3' | 'blob';
  connectionString?: string;
  queryTemplate?: string;
  authType: 'none' | 'bearer' | 'api_key' | 'basic';
  priority: number;
  weight: number;
  timeoutMs: number;
  enabled: boolean;
  healthStatus: string;
  circuitBreakerTripped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResourceWithBackends extends ApiResource {
  backends?: ApiResourceBackend[];
}

export interface ApiCreateResourceBackend {
  name: string;
  backendType: 'postgres' | 'http' | 's3' | 'blob';
  connectionString?: string;
  queryTemplate?: string;
  authType: 'none' | 'bearer' | 'api_key' | 'basic';
  authConfig?: Record<string, string>;
  priority?: number;
  weight?: number;
  timeoutMs?: number;
}

export interface ApiCreateResourceRequest {
  name: string;
  displayName?: string;
  description?: string;
  resourceUri?: string;
  mimeType?: string;
  enabled?: boolean;
  cacheTtlSeconds?: number;
  parametersSchema?: Record<string, unknown>;
  backends?: ApiCreateResourceBackend[];
}

export interface ApiResourceExecutionResult {
  resourceId: string;
  backendId?: string;
  success: boolean;
  latencyMs: number;
  content?: string;
  mimeType?: string;
  result?: unknown;
  error?: string;
  cached: boolean;
}
