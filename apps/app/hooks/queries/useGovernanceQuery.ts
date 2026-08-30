import { useQuery } from '@tanstack/react-query';
import { apiGetGovernancePolicies } from '@/lib/api';
export {
  useCreateGovernancePolicyMutation as useCreateGovernancePolicy,
  useUpdateGovernancePolicyMutation as useUpdateGovernancePolicy,
  useDeleteGovernancePolicyMutation as useDeleteGovernancePolicy,
  useEvaluateRBACMutation as useEvaluateRBAC,
} from '@/hooks/mutations/useGovernanceMutations';

export function useGovernancePoliciesQuery() {
  return useQuery({
    queryKey: ['governance-policies'],
    queryFn: apiGetGovernancePolicies,
  });
}

export { useGovernancePoliciesQuery as useGovernanceQuery };
