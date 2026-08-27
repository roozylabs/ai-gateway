import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetQuotas, apiUpdateQuota, ApiTenantQuota } from '@/lib/api';

export function useQuotasQuery() {
  return useQuery({
    queryKey: ['quotas'],
    queryFn: () => apiGetQuotas(),
  });
}

export function useUpdateQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetType, targetId, data }: { targetType: string; targetId: string; data: Partial<ApiTenantQuota> }) =>
      apiUpdateQuota(targetType, targetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
    },
  });
}
