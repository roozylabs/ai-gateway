import { api } from './client';
import { ApiRequestLog, ApiLogAnalytics } from './types/log';
import { PaginatedResult } from './types/common';

export async function apiGetLogs(params?: {
  page?: number;
  limit?: number;
  provider?: string;
  model?: string;
  status?: number;
  search?: string;
}): Promise<PaginatedResult<ApiRequestLog>> {
  const response = await api.get<PaginatedResult<ApiRequestLog>>('/logs', { params });
  return response.data;
}

export async function apiGetLogAnalytics(params?: { window?: string; limit?: number }): Promise<ApiLogAnalytics> {
  const response = await api.get<ApiLogAnalytics | { data: ApiLogAnalytics }>('/analytics/logs', { params });
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data as ApiLogAnalytics;
}
