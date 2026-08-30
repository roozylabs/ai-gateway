import { api } from './client';
import {
  ApiDashboardStats,
  ApiUsagePoint,
  ApiProviderHealth,
  ApiActiveStreams,
} from './types/dashboard';

export async function apiGetDashboardStats(params?: { days?: number; startDate?: string; endDate?: string }): Promise<ApiDashboardStats> {
  const response = await api.get<ApiDashboardStats>('/dashboard/stats', { params });
  return response.data;
}

export async function apiGetDashboardUsage(params?: { days?: number; startDate?: string; endDate?: string }): Promise<ApiUsagePoint[]> {
  const response = await api.get<ApiUsagePoint[]>('/dashboard/usage', { params });
  return response.data;
}

export async function apiGetDashboardHealth(): Promise<ApiProviderHealth[]> {
  const response = await api.get<ApiProviderHealth[]>('/dashboard/health');
  return response.data;
}

export async function apiGetActiveStreams(): Promise<ApiActiveStreams> {
  const response = await api.get<ApiActiveStreams>('/dashboard/active-streams');
  return response.data;
}
