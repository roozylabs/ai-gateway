import { api } from './client';
import {
  ApiAgentTemplate,
  ApiAgent,
  ApiCreateAgentRequest,
  ApiAgentStats,
} from './types/agent';

export async function apiGetAgentTemplates(): Promise<ApiAgentTemplate[]> {
  const response = await api.get<ApiAgentTemplate[]>('/agent-templates');
  return response.data;
}

export async function apiInstantiateAgentTemplate(templateId: string, name?: string): Promise<ApiAgent> {
  const response = await api.post<ApiAgent>(`/agent-templates/${templateId}/instantiate`, { name });
  return response.data;
}

export async function apiGetAgents(): Promise<ApiAgent[]> {
  const response = await api.get<ApiAgent[]>('/agents');
  return response.data;
}

export async function apiGetAgent(id: string): Promise<ApiAgent> {
  const response = await api.get<ApiAgent>(`/agents/${id}`);
  return response.data;
}

export async function apiGetAgentStats(id: string, days = 30): Promise<ApiAgentStats> {
  const response = await api.get<{ data: ApiAgentStats } | ApiAgentStats>(`/agents/${id}/stats`, {
    params: { days },
  });
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data as ApiAgentStats;
}

export async function apiCreateAgent(data: ApiCreateAgentRequest): Promise<ApiAgent> {
  const response = await api.post<ApiAgent>('/agents', data);
  return response.data;
}

export async function apiUpdateAgent(id: string, data: Partial<ApiCreateAgentRequest>): Promise<ApiAgent> {
  const response = await api.put<ApiAgent>(`/agents/${id}`, data);
  return response.data;
}

export async function apiDeleteAgent(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/agents/${id}`);
  return response.data;
}
