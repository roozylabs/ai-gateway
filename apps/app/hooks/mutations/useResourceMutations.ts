import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiCreateResource,
  apiUpdateResource,
  apiDeleteResource,
  apiTestResource,
  ApiCreateResourceRequest,
} from '@/lib/api';

export function useCreateResourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApiCreateResourceRequest) => apiCreateResource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useUpdateResourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiCreateResourceRequest> }) =>
      apiUpdateResource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useDeleteResourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useTestResourceMutation() {
  return useMutation({
    mutationFn: ({ id, args }: { id: string; args: Record<string, unknown> }) =>
      apiTestResource(id, args),
  });
}

export { useCreateResourceMutation as useCreateResource };
export { useUpdateResourceMutation as useUpdateResource };
export { useDeleteResourceMutation as useDeleteResource };
export { useTestResourceMutation as useTestResource };
