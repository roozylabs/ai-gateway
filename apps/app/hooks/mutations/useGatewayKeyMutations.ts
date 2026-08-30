import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCreateGatewayKey, apiDeleteGatewayKey } from '@/lib/api';

export function useCreateGatewayKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      providerId?: string;
      rateLimit?: number | string;
      budgetLimitMonthly?: number;
      allowedModels?: string[];
      allowedProviders?: string[];
      expiresInDays?: number;
    }) => apiCreateGatewayKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
    },
  });
}

export function useDeleteGatewayKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteGatewayKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
    },
  });
}

export { useCreateGatewayKeyMutation as useCreateGatewayKey };
export { useDeleteGatewayKeyMutation as useDeleteGatewayKey };
