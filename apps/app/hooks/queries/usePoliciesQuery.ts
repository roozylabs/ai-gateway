import { useQuery } from '@tanstack/react-query';
import { apiGetPolicies } from '@/lib/api';
export {
  useCreatePolicyMutation as useCreatePolicy,
  useUpdatePolicyMutation as useUpdatePolicy,
  useDeletePolicyMutation as useDeletePolicy,
  useSetDefaultPolicyMutation as useSetDefaultPolicy,
} from '@/hooks/mutations/usePolicyMutations';

export function usePoliciesQuery() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: apiGetPolicies,
  });
}
