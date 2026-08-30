import { api } from './client';
import { ApiModel } from './types/model';
import { prependSmartRouterModel } from './smart-router';

export async function apiGetModels(providerId?: string): Promise<ApiModel[]> {
  const url = providerId ? `/providers/${providerId}/models` : '/models';
  const response = await api.get<ApiModel[]>(url);
  const models = response.data || [];
  return prependSmartRouterModel(models);
}

export async function apiGetAllModels(): Promise<ApiModel[]> {
  const response = await api.get<ApiModel[]>('/models');
  const models = response.data || [];
  return prependSmartRouterModel(models);
}

export async function apiCreateModel(providerId: string, data: Partial<ApiModel>): Promise<ApiModel> {
  const response = await api.post<ApiModel>(`/providers/${providerId}/models`, data);
  return response.data;
}

export async function apiUpdateModel(providerId: string, id: string, data: Partial<ApiModel>): Promise<ApiModel> {
  const response = await api.put<ApiModel>(`/providers/${providerId}/models/${id}`, data);
  return response.data;
}

export async function apiDeleteModel(providerId: string, id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/providers/${providerId}/models/${id}`);
  return response.data;
}
