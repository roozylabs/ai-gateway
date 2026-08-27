import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiTestTool, apiCreateTool, apiUpdateTool, apiDeleteTool, ApiCreateToolRequest } from '@/lib/api';

export function useTestToolMutation() {
  return useMutation({
    mutationFn: (d: { toolId: string; args: Record<string, unknown> }) =>
      apiTestTool(d.toolId, d.args),
  });
}

export function useCreateToolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (toolData: ApiCreateToolRequest) => apiCreateTool(toolData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}

export function useUpdateToolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (d: { id: string; toolData: ApiCreateToolRequest }) =>
      apiUpdateTool(d.id, d.toolData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}

export function useDeleteToolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDeleteTool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}
