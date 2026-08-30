import { useQuery } from '@tanstack/react-query';
import { apiGetAgents } from '@/lib/api';
export { useCreateAgentMutation as useCreateAgent, useUpdateAgentMutation as useUpdateAgent, useDeleteAgentMutation as useDeleteAgent } from '@/hooks/mutations/useAgentMutations';

export function useAgentsQuery() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: apiGetAgents,
  });
}
