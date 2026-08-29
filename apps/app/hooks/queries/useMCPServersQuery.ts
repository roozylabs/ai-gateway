import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetMCPServers, apiGetMCPServer, apiCreateMCPServer, apiUpdateMCPServer, apiDeleteMCPServer, apiSyncMCPServer } from '@/lib/api';

export function useMCPServersQuery() {
  return useQuery({
    queryKey: ['mcp-servers'],
    queryFn: apiGetMCPServers,
  });
}

export function useMCPServerQuery(id: string) {
  return useQuery({
    queryKey: ['mcp-servers', id, 'edit'],
    queryFn: () => apiGetMCPServer(id),
    enabled: Boolean(id),
  });
}

export function useCreateMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiCreateMCPServer>[0]) => apiCreateMCPServer(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });
}

export function useUpdateMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Parameters<typeof apiUpdateMCPServer>[1] }) =>
      apiUpdateMCPServer(args.id, args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });
}

export function useDeleteMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteMCPServer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });
}

export function useSyncMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSyncMCPServer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });
}
