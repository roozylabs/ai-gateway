import { useQuery } from '@tanstack/react-query';
import { apiGetAllModels } from '@/lib/api';

export function useModelsListQuery() {
  return useQuery({
    queryKey: ['all-models'],
    queryFn: apiGetAllModels,
  });
}
