import { api } from './client';
import {
  ApiAgentTemplate,
  ApiAgent,
  ApiCreateAgentRequest,
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
