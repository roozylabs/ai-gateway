import { useQuery } from '@tanstack/react-query';
import { apiGetTools, apiGetTool } from '@/lib/api';
export {
  useCreateToolMutation as useCreateTool,
  useUpdateToolMutation as useUpdateTool,
  useDeleteToolMutation as useDeleteTool,
  useTestToolMutation as useTestTool,
} from '@/hooks/mutations/useToolMutations';

export function useToolsQuery() {
  return useQuery({
    queryKey: ['tools'],
    queryFn: apiGetTools,
  });
}

export function useToolDetailQuery(toolId?: string) {
  return useQuery({
    queryKey: ['tools', toolId],
    queryFn: () => apiGetTool(toolId!),
    enabled: Boolean(toolId),
  });
}

