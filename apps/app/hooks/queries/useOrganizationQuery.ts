import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetSettings, apiUpdateSettings } from '@/lib/api';

export function useOrganizationQuery() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: apiGetSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, string>) => apiUpdateSettings(settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}
