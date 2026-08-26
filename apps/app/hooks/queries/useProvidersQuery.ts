import { useQuery } from '@tanstack/react-query';
import { apiGetProviders } from '@/lib/api';

export function useProvidersQuery() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: apiGetProviders,
  });
}
