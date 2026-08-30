import { useQuery } from '@tanstack/react-query';
import { apiGetProviders } from '@/lib/api';
export { useCreateProviderMutation as useCreateProvider, useUpdateProviderMutation as useUpdateProvider, useDeleteProviderMutation as useDeleteProvider } from '@/hooks/mutations/useProviderMutations';

export function useProvidersQuery() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });
}
