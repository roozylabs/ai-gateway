import { useQuery } from '@tanstack/react-query';
import { apiGetBillingPlans, apiGetActiveSubscription, apiGetInvoices } from '@/lib/api';
export { useUpgradeSubscriptionMutation as useUpgradeSubscription } from '@/hooks/mutations/useBillingMutations';

export function useBillingPlansQuery() {
  return useQuery({
    queryKey: ['billing-plans'],
    queryFn: apiGetBillingPlans,
  });
}

export function useActiveSubscriptionQuery() {
  return useQuery({
    queryKey: ['billing-subscription'],
    queryFn: apiGetActiveSubscription,
  });
}

export function useInvoicesQuery() {
  return useQuery({
    queryKey: ['billing-invoices'],
    queryFn: apiGetInvoices,
  });
}

export { useActiveSubscriptionQuery as useBillingSubscriptionQuery };
export { useInvoicesQuery as useBillingInvoicesQuery };
