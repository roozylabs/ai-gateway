import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetGovernancePolicies, apiCreateGovernancePolicy, apiUpdateGovernancePolicy, apiDeleteGovernancePolicy, apiEvaluateRBAC } from '@/lib/api';

export function useGovernanceQuery() {
  return useQuery({
    queryKey: ['governance-policies'],
    queryFn: apiGetGovernancePolicies,
  });
}

export function useCreateGovernancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiCreateGovernancePolicy>[0]) => apiCreateGovernancePolicy(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-policies'] }),
  });
}

export function useUpdateGovernancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Parameters<typeof apiUpdateGovernancePolicy>[1] }) =>
      apiUpdateGovernancePolicy(args.id, args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-policies'] }),
  });
}

export function useDeleteGovernancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteGovernancePolicy(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-policies'] }),
  });
}

export function useEvaluateRBAC() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiEvaluateRBAC>[0]) => apiEvaluateRBAC(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-policies'] }),
  });
}
