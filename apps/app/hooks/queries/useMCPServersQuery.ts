import { useQuery } from '@tanstack/react-query';
import {
  apiGetMCPServers,
  apiGetMCPServer,
  apiGetMCPServerTools,
  apiGetMCPServerStats,
} from '@/lib/api';
export {
  useCreateMCPServerMutation as useCreateMCPServer,
  useUpdateMCPServerMutation as useUpdateMCPServer,
  useDeleteMCPServerMutation as useDeleteMCPServer,
  useSyncMCPServerMutation as useSyncMCPServer,
  useTestMCPToolMutation as useTestMCPTool,
} from '@/hooks/mutations/useMCPMutations';

export function useMCPServersQuery() {
  return useQuery({
    queryKey: ['mcp-servers'],
    queryFn: apiGetMCPServers,
  });
}

export function useMCPServerToolsQuery(serverId?: string | null) {
  return useQuery({
    queryKey: ['mcp-servers', serverId, 'tools'],
    queryFn: () => (serverId ? apiGetMCPServerTools(serverId) : Promise.resolve([])),
    enabled: Boolean(serverId),
  });
}

export function useMCPServerEditQuery(id: string) {
  return useQuery({
    queryKey: ['mcp-servers', id, 'edit'],
    queryFn: () => apiGetMCPServer(id),
    enabled: Boolean(id),
  });
}

export function useMCPServerStatsQuery(id: string, days: number = 30) {
  return useQuery({
    queryKey: ['mcp-servers', id, 'stats', days],
    queryFn: () => apiGetMCPServerStats(id, days),
    enabled: Boolean(id),
  });
}
