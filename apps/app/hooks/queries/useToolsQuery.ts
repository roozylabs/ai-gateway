import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetTools, apiCreateTool, apiUpdateTool, apiDeleteTool, apiTestTool } from '@/lib/api';

export function useToolsQuery() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: apiGetTools,
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiCreateTool>[0]) => apiCreateTool(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Parameters<typeof apiUpdateTool>[1] }) =>
      apiUpdateTool(args.id, args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
  });
}

export function useDeleteTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteTool(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
  });
}

export function useTestTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; args: Record<string, any> }) =>
      apiTestTool(args.id, args.args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tools'] }),
  });
}
