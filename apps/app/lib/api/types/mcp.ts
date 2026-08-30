export interface ApiMCPServer {
  id: string;
  name: string;
  displayName?: string;
  slug: string;
  description: string;
  type?: 'remote' | 'local';
  transportType: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  serverUrl?: string;
  endpointUrl?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authToken?: string;
  hasAuthToken?: boolean;
  authConfig?: Record<string, string>;
  env?: Record<string, string>;
  envVars?: Record<string, string>;
  headers?: Record<string, string>;
  enabled: boolean;
  status?: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastPingAt?: string;
  toolsCount: number;
  resourcesCount: number;
  circuitBreakerTripped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMCPTool {
  id: string;
  serverId: string;
  name: string;
  displayName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMCPServerWithTools extends ApiMCPServer {
  tools?: ApiMCPTool[];
}

export interface ApiMCPServerEdit {
  id: string;
  name: string;
  displayName?: string;
  slug: string;
  description: string;
  type?: 'remote' | 'local';
  transportType: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  serverUrl?: string;
  endpointUrl?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authToken?: string;
  authConfig?: Record<string, string>;
  env?: Record<string, string>;
  envVars?: Record<string, string>;
  headers?: Record<string, string>;
  enabled: boolean;
}

export interface ApiCreateMCPServerRequest {
  name: string;
  displayName?: string;
  slug?: string;
  description: string;
  type?: 'remote' | 'local';
  transportType: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  serverUrl?: string;
  endpointUrl?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authToken?: string;
  authConfig?: Record<string, string>;
  env?: Record<string, string>;
  envVars?: Record<string, string>;
  headers?: Record<string, string>;
  enabled?: boolean;
}

export interface ApiMCPToolExecutionResult {
  toolId: string;
  toolName: string;
  serverId: string;
  serverName: string;
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  result?: unknown;
  error?: string;
  cached: boolean;
}

export interface ApiMCPToolStat {
  toolId: string;
  toolName: string;
  requests: number;
  avgLatencyMs: number;
  errorRate: number;
}

export interface ApiMCPAgentBinding {
  agentId: string;
  agentName: string;
  toolsEnabled: number;
  lastInvokedAt?: string;
}

export interface ApiMCPServerStats {
  serverId: string;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  successCount?: number;
  errorCount?: number;
  topTools: ApiMCPToolStat[];
  agentBindings: ApiMCPAgentBinding[];
  tools?: Array<{ tool: string; requests: number; errors: number; avgLatencyMs: number }>;
  agents?: Array<{ id: string; name: string; displayName?: string; enabled?: boolean }>;
}

export interface ApiMCPRegistryServer {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  iconUrl?: string;
  author: string;
  verified: boolean;
  transportType: 'stdio' | 'sse' | 'http';
  defaultCommand?: string;
  defaultArgs?: string[];
  defaultServerUrl?: string;
  schemaDocsUrl?: string;
  toolsCount: number;
  downloadsCount: number;
  tags?: string[];
  createdAt: string;
}

export interface ApiRegisterMCPRegistryRequest {
  registryServerId: string;
  name?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authConfig?: Record<string, string>;
  envVars?: Record<string, string>;
  headers?: Record<string, string>;
  overrideCommand?: string;
  overrideArgs?: string[];
  overrideServerUrl?: string;
}
