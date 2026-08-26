import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetProviders, apiDeleteProvider } from '@/lib/api';

export function useProvidersQuery() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
}
