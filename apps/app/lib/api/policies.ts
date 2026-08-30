import { api } from './client';
import {
  ApiRoutingPolicy,
  ApiRoutingDecision,
  ApiRoutingSimulationReq,
  ApiRoutingSimulationRes,
  ApiFinOpsSummary,
} from './types/policy';

export async function apiGetPolicies(): Promise<ApiRoutingPolicy[]> {
  const response = await api.get<ApiRoutingPolicy[]>('/policies');
  return response.data;
}

export async function apiCreatePolicy(data: Partial<ApiRoutingPolicy>): Promise<ApiRoutingPolicy> {
  const response = await api.post<ApiRoutingPolicy>('/policies', data);
  return response.data;
}

export async function apiUpdatePolicy(id: string, data: Partial<ApiRoutingPolicy>): Promise<ApiRoutingPolicy> {
  const response = await api.put<ApiRoutingPolicy>(`/policies/${id}`, data);
  return response.data;
}

export async function apiSetDefaultPolicy(id: string): Promise<ApiRoutingPolicy> {
  const response = await api.put<ApiRoutingPolicy>(`/policies/${id}/default`);
  return response.data;
}

export async function apiDeletePolicy(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/policies/${id}`);
  return response.data;
}

export async function apiGetRoutingDecisions(limit?: number): Promise<ApiRoutingDecision[]> {
  const response = await api.get<ApiRoutingDecision[]>('/routing/decisions', {
    params: limit ? { limit } : undefined,
  });
  return response.data;
}

export async function apiSimulateRouting(data: ApiRoutingSimulationReq): Promise<ApiRoutingSimulationRes> {
  const response = await api.post<ApiRoutingSimulationRes>('/routing/simulate', data);
  return response.data;
}

export async function apiGetFinOpsSummary(): Promise<ApiFinOpsSummary> {
  const response = await api.get<ApiFinOpsSummary | { data: ApiFinOpsSummary }>('/analytics/finops');
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data as ApiFinOpsSummary;
}
