import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetPolicies, apiCreatePolicy, apiUpdatePolicy, apiDeletePolicy, apiSetDefaultPolicy } from '@/lib/api';

export function usePoliciesQuery() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: apiGetPolicies,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiCreatePolicy>[0]) => apiCreatePolicy(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Parameters<typeof apiUpdatePolicy>[1] }) =>
      apiUpdatePolicy(args.id, args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeletePolicy(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  });
}

export function useSetDefaultPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSetDefaultPolicy(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  });
}
