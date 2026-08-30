import { api } from './client';
import { ApiHealthResponse } from './types/common';

export async function apiGetSettings(): Promise<Record<string, string>> {
  const response = await api.get<Record<string, string>>('/settings');
  return response.data;
}

export async function apiUpdateSettings(data: Record<string, string>): Promise<Record<string, string>> {
  const response = await api.put<Record<string, string>>('/settings', data);
  return response.data;
}

export async function apiGetHealth(): Promise<ApiHealthResponse> {
  const response = await api.get<ApiHealthResponse>('/health');
  return response.data;
}
