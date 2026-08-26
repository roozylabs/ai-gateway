import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetResources, apiCreateResource, apiUpdateResource, apiDeleteResource, apiTestResource } from '@/lib/api';

export function useResourcesQuery() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: apiGetResources,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof apiCreateResource>[0]) => apiCreateResource(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Parameters<typeof apiUpdateResource>[1] }) =>
      apiUpdateResource(args.id, args.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteResource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
}

export function useTestResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; args: Record<string, any> }) =>
      apiTestResource(args.id, args.args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
}
