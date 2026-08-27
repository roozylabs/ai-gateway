import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiTestMCPTool, apiCreateMCPServer, apiUpdateMCPServer, apiDeleteMCPServer, apiSyncMCPServer, ApiCreateMCPServerRequest } from '@/lib/api';

export function useTestMCPToolMutation() {
  return useMutation({
    mutationFn: (d: { serverId: string; toolName: string; args: Record<string, unknown> }) =>
      apiTestMCPTool(d.serverId, d.toolName, d.args),
  });
}

export function useCreateMCPServerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApiCreateMCPServerRequest) => apiCreateMCPServer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });
}

export function useUpdateMCPServerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (d: { id: string; data: Partial<ApiCreateMCPServerRequest> }) =>
      apiUpdateMCPServer(d.id, d.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });
}

export function useDeleteMCPServerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDeleteMCPServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });
}

export function useSyncMCPServerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiSyncMCPServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
  });
}
