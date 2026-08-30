import { api } from './client';
import {
  ApiTool,
  ApiToolWithBackends,
  ApiCreateToolRequest,
  ApiToolExecutionResult,
} from './types/tool';

export async function apiGetTools(): Promise<ApiTool[]> {
  const response = await api.get<ApiTool[]>('/tools');
  return response.data;
}

export async function apiGetTool(id: string): Promise<ApiToolWithBackends> {
  const response = await api.get<ApiToolWithBackends>(`/tools/${id}`);
  return response.data;
}

export async function apiCreateTool(data: ApiCreateToolRequest): Promise<ApiToolWithBackends> {
  const response = await api.post<ApiToolWithBackends>('/tools', data);
  return response.data;
}

export async function apiUpdateTool(id: string, data: Partial<ApiCreateToolRequest>): Promise<ApiToolWithBackends> {
  const response = await api.put<ApiToolWithBackends>(`/tools/${id}`, data);
  return response.data;
}

export async function apiDeleteTool(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/tools/${id}`);
  return response.data;
}

export async function apiTestTool(id: string, args: Record<string, unknown>): Promise<ApiToolExecutionResult> {
  const response = await api.post<ApiToolExecutionResult>(`/tools/${id}/test`, { args });
  return response.data;
}
