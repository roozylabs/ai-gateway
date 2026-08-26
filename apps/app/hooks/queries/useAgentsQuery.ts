import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetAgents, apiCreateAgent, apiUpdateAgent, apiDeleteAgent } from '@/lib/api';

export function useAgentsQuery() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: apiGetAgents,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiCreateAgent>[0]) => apiCreateAgent(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Parameters<typeof apiUpdateAgent>[1] }) =>
      apiUpdateAgent(args.id, args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteAgent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}
