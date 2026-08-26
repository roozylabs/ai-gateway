import { useQuery } from '@tanstack/react-query';
import { apiGetModels } from '@/lib/api';

export function useModelsQuery(providerId?: string) {
  return useQuery({
    queryKey: ['models', providerId],
    queryFn: () => apiGetModels(providerId ?? ''),
    enabled: !!providerId,
  });
}
