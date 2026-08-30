import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCreateProvider, apiUpdateProvider, apiDeleteProvider, ApiProvider } from '@/lib/api';

export function useCreateProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ApiProvider>) => apiCreateProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useUpdateProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiProvider> }) =>
      apiUpdateProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export function useDeleteProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}

export { useCreateProviderMutation as useCreateProvider };
export { useUpdateProviderMutation as useUpdateProvider };
export { useDeleteProviderMutation as useDeleteProvider };
