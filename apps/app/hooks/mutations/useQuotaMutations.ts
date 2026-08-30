import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUpdateQuota, ApiTenantQuota } from '@/lib/api';

export function useUpdateQuotaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetType, targetId, data }: { targetType: string; targetId: string; data: Partial<ApiTenantQuota> }) =>
      apiUpdateQuota(targetType, targetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
    },
  });
}

export { useUpdateQuotaMutation as useUpdateQuota };
