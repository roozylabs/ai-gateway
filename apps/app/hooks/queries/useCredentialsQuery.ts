import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetCredentials, apiDeleteCredential } from '@/lib/api';

export function useCredentialsQuery(providerId: string = 'openai') {
  return useQuery({
    queryKey: ['credentials', providerId],
    queryFn: () => apiGetCredentials(providerId),
  });
}

export function useDeleteCredential(providerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credId: string) => apiDeleteCredential(providerId, credId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}
