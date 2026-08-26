import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetModels, apiCreateModel, apiDeleteModel } from '@/lib/api';

export function useModelsQuery(providerId?: string) {
  return useQuery({
    queryKey: ['models', providerId],
    queryFn: () => apiGetModels(providerId ?? ''),
    enabled: !!providerId,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { providerId: string; data: { name: string; slug: string; displayName: string; inputPricePer1M?: number; outputPricePer1M?: number; qualityScore?: number; speedScore?: number } }) =>
      apiCreateModel(args.providerId, args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-models'] }),
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { providerId: string; modelId: string }) =>
      apiDeleteModel(args.providerId, args.modelId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-models'] }),
  });
}
