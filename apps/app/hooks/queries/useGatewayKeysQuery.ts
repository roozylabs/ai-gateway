import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetGatewayKeys, apiCreateGatewayKey, apiDeleteGatewayKey } from '@/lib/api';

export function useGatewayKeysQuery(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['gateway-keys', params],
    queryFn: () => apiGetGatewayKeys(params),
  });
}

export function useCreateGatewayKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiCreateGatewayKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
    },
  });
}

export function useDeleteGatewayKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiDeleteGatewayKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateway-keys'] });
    },
  });
}
