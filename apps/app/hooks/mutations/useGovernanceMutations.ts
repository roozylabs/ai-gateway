import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiCreateGovernancePolicy,
  apiUpdateGovernancePolicy,
  apiDeleteGovernancePolicy,
  apiEvaluateRBAC,
  ApiCreateGovernancePolicyRequest,
  ApiRBACEvaluationRequest,
} from '@/lib/api';

export function useCreateGovernancePolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApiCreateGovernancePolicyRequest) => apiCreateGovernancePolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
    },
  });
}

export function useUpdateGovernancePolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiCreateGovernancePolicyRequest> }) =>
      apiUpdateGovernancePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
    },
  });
}

export function useDeleteGovernancePolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteGovernancePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
    },
  });
}

export function useEvaluateRBACMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApiRBACEvaluationRequest) => apiEvaluateRBAC(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
    },
  });
}

export { useCreateGovernancePolicyMutation as useCreateGovernancePolicy };
export { useUpdateGovernancePolicyMutation as useUpdateGovernancePolicy };
export { useDeleteGovernancePolicyMutation as useDeleteGovernancePolicy };
export { useEvaluateRBACMutation as useEvaluateRBAC };
