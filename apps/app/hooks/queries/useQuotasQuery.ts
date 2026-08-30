import { useQuery } from '@tanstack/react-query';
import { apiGetQuotas } from '@/lib/api';
export { useUpdateQuotaMutation as useUpdateQuota } from '@/hooks/mutations/useQuotaMutations';

export function useQuotasQuery() {
  return useQuery({
    queryKey: ['quotas'],
    queryFn: () => apiGetQuotas(),
  });
}
