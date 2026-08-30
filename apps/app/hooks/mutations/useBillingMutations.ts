import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUpgradeSubscription } from '@/lib/api';

export function useUpgradeSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => apiUpgradeSubscription(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
}

export { useUpgradeSubscriptionMutation as useUpgradeSubscription };
