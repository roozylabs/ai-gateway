import { api } from './client';
import {
  ApiMCPServer,
  ApiMCPServerWithTools,
  ApiCreateMCPServerRequest,
  ApiMCPTool,
  ApiMCPToolExecutionResult,
  ApiMCPServerStats,
  ApiMCPRegistryServer,
  ApiRegisterMCPRegistryRequest,
} from './types/mcp';

export async function apiGetMCPServers(): Promise<ApiMCPServer[]> {
  const response = await api.get<ApiMCPServer[]>('/mcp/servers');
  return response.data;
}

export async function apiGetMCPServer(id: string): Promise<ApiMCPServerWithTools> {
  const response = await api.get<ApiMCPServerWithTools>(`/mcp/servers/${id}`);
  return response.data;
}

export async function apiCreateMCPServer(data: ApiCreateMCPServerRequest): Promise<ApiMCPServer> {
  const response = await api.post<ApiMCPServer>('/mcp/servers', data);
  return response.data;
}

export async function apiUpdateMCPServer(id: string, data: Partial<ApiCreateMCPServerRequest>): Promise<ApiMCPServer> {
  const response = await api.put<ApiMCPServer>(`/mcp/servers/${id}`, data);
  return response.data;
}

export async function apiDeleteMCPServer(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/mcp/servers/${id}`);
  return response.data;
}

export async function apiSyncMCPServer(id: string): Promise<{ message: string; toolsCount: number }> {
  const response = await api.post<{ message: string; toolsCount: number }>(`/mcp/servers/${id}/sync`);
  return response.data;
}

export async function apiTestMCPTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<ApiMCPToolExecutionResult> {
  const response = await api.post<ApiMCPToolExecutionResult>(`/mcp/servers/${serverId}/test`, {
    toolName,
    args,
  });
  return response.data;
}

export async function apiGetMCPServerTools(serverId: string): Promise<ApiMCPTool[]> {
  const response = await api.get<ApiMCPTool[]>(`/mcp/servers/${serverId}/tools`);
  return response.data;
}

export async function apiGetMCPServerStats(id: string, days?: number): Promise<ApiMCPServerStats> {
  const response = await api.get<ApiMCPServerStats | { data: ApiMCPServerStats }>(`/mcp/servers/${id}/stats`, {
    params: days ? { days } : undefined,
  });
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data as ApiMCPServerStats;
}

export async function apiGetMCPRegistryCatalog(): Promise<ApiMCPRegistryServer[]> {
  const response = await api.get<ApiMCPRegistryServer[]>('/mcp/registry');
  return response.data;
}

export async function apiRegisterMCPRegistryServer(data: ApiRegisterMCPRegistryRequest): Promise<ApiMCPServer> {
  const response = await api.post<ApiMCPServer>('/mcp/registry/register', data);
  return response.data;
}
