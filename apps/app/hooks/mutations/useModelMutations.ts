import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCreateModel, apiUpdateModel, apiDeleteModel, ApiModel } from '@/lib/api';

export function useCreateModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<ApiModel> }) =>
      apiCreateModel(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useUpdateModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, id, data }: { providerId: string; id: string; data: Partial<ApiModel> }) =>
      apiUpdateModel(providerId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useDeleteModelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, id }: { providerId: string; id: string }) =>
      apiDeleteModel(providerId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export { useCreateModelMutation as useCreateModel };
export { useUpdateModelMutation as useUpdateModel };
export { useDeleteModelMutation as useDeleteModel };
