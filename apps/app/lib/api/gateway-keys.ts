import { api } from './client';
import { ApiGatewayKey } from './types/gateway-key';
import { PaginatedResult } from './types/common';

export async function apiGetGatewayKeys(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResult<ApiGatewayKey>> {
  const response = await api.get<PaginatedResult<ApiGatewayKey>>('/gateway-keys', { params });
  return response.data;
}

export async function apiCreateGatewayKey(data: {
  name: string;
  providerId?: string;
  rateLimit?: number | string;
  budgetLimitMonthly?: number;
  allowedModels?: string[];
  allowedProviders?: string[];
  expiresInDays?: number;
}): Promise<ApiGatewayKey & { rawKey?: string }> {
  const response = await api.post<ApiGatewayKey & { rawKey?: string }>('/gateway-keys', data);
  return response.data;
}

export async function apiDeleteGatewayKey(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/gateway-keys/${id}`);
  return response.data;
}
