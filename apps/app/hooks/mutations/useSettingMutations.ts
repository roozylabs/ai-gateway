import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUpdateSettings } from '@/lib/api';

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string>) => apiUpdateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export { useUpdateSettingsMutation as useUpdateSettings };
