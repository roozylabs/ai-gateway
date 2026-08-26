import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetBillingPlans, apiGetActiveSubscription, apiGetInvoices, apiUpgradeSubscription } from '@/lib/api';

export function useBillingPlansQuery() {
  return useQuery({
    queryKey: ['billing-plans'],
    queryFn: apiGetBillingPlans,
  });
}

export function useBillingSubscriptionQuery() {
  return useQuery({
    queryKey: ['billing-subscription'],
    queryFn: apiGetActiveSubscription,
  });
}

export function useBillingInvoicesQuery() {
  return useQuery({
    queryKey: ['billing-invoices'],
    queryFn: apiGetInvoices,
  });
}

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planSlug: string) => apiUpgradeSubscription(planSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
}
