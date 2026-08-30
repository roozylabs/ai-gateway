export interface ApiTool {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  inputSchema: Record<string, unknown>;
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  cacheTtlSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiToolBackend {
  id: string;
  toolId: string;
  name: string;
  backendType: 'http' | 'lambda' | 'sql' | 'grpc';
  endpointUrl: string;
  httpMethod?: string;
  headers?: Record<string, string>;
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

export interface ApiToolWithBackends extends Partial<ApiTool> {
  id?: string;
  name?: string;
  tool?: ApiTool;
  backends?: ApiToolBackend[];
}

export interface ApiCreateToolBackend {
  name: string;
  endpointUrl: string;
  backendType?: 'http' | 'lambda' | 'sql' | 'grpc';
  httpMethod?: string;
  headers?: Record<string, string>;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authToken?: string;
  authConfig?: Record<string, string>;
  priority?: number;
  weight?: number;
  timeoutMs?: number;
}

export interface ApiCreateToolRequest {
  name: string;
  displayName?: string;
  description?: string;
  category?: string;
  inputSchema?: Record<string, unknown>;
  enabled?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  cacheTtlSeconds?: number;
  backends?: ApiCreateToolBackend[];
}

export interface ApiToolExecutionResult {
  toolId: string;
  backendId?: string;
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  result?: unknown;
  error?: string;
  cached: boolean;
}
