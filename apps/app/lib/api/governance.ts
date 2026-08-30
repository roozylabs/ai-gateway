import { api } from './client';
import {
  ApiGovernancePolicy,
  ApiCreateGovernancePolicyRequest,
  ApiRBACEvaluationRequest,
  ApiRBACEvaluationResult,
} from './types/governance';

export async function apiGetGovernancePolicies(): Promise<ApiGovernancePolicy[]> {
  const response = await api.get<ApiGovernancePolicy[]>('/governance/policies');
  return response.data;
}

export async function apiGetGovernancePolicy(id: string): Promise<ApiGovernancePolicy> {
  const response = await api.get<ApiGovernancePolicy>(`/governance/policies/${id}`);
  return response.data;
}

export async function apiCreateGovernancePolicy(data: ApiCreateGovernancePolicyRequest): Promise<ApiGovernancePolicy> {
  const response = await api.post<ApiGovernancePolicy>('/governance/policies', data);
  return response.data;
}

export async function apiUpdateGovernancePolicy(id: string, data: Partial<ApiCreateGovernancePolicyRequest>): Promise<ApiGovernancePolicy> {
  const response = await api.put<ApiGovernancePolicy>(`/governance/policies/${id}`, data);
  return response.data;
}

export async function apiDeleteGovernancePolicy(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/governance/policies/${id}`);
  return response.data;
}

export async function apiEvaluateRBAC(data: ApiRBACEvaluationRequest): Promise<ApiRBACEvaluationResult> {
  const response = await api.post<ApiRBACEvaluationResult>('/governance/evaluate', data);
  return response.data;
}
