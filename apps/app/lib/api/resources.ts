import { api } from './client';
import {
  ApiResource,
  ApiResourceWithBackends,
  ApiCreateResourceRequest,
  ApiResourceExecutionResult,
} from './types/resource';

export async function apiGetResources(): Promise<ApiResource[]> {
  const response = await api.get<ApiResource[]>('/resources');
  return response.data;
}

export async function apiGetResource(id: string): Promise<ApiResourceWithBackends> {
  const response = await api.get<ApiResourceWithBackends>(`/resources/${id}`);
  return response.data;
}

export async function apiCreateResource(data: ApiCreateResourceRequest): Promise<ApiResourceWithBackends> {
  const response = await api.post<ApiResourceWithBackends>('/resources', data);
  return response.data;
}

export async function apiUpdateResource(id: string, data: Partial<ApiCreateResourceRequest>): Promise<ApiResourceWithBackends> {
  const response = await api.put<ApiResourceWithBackends>(`/resources/${id}`, data);
  return response.data;
}

export async function apiDeleteResource(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/resources/${id}`);
  return response.data;
}

export async function apiTestResource(id: string, args: Record<string, unknown>): Promise<ApiResourceExecutionResult> {
  const response = await api.post<ApiResourceExecutionResult>(`/resources/${id}/test`, { args });
  return response.data;
}
