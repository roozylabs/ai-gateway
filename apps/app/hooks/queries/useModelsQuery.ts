import { useQuery } from '@tanstack/react-query';
import { apiGetModels } from '@/lib/api';
export { useCreateModelMutation as useCreateModel, useUpdateModelMutation as useUpdateModel, useDeleteModelMutation as useDeleteModel } from '@/hooks/mutations/useModelMutations';

export function useModelsQuery(providerId: string) {
  return useQuery({
    queryKey: ['models', providerId],
    queryFn: () => apiGetModels(providerId),
    enabled: !!providerId,
  });
}
