import { useQuery } from '@tanstack/react-query';
import { apiGetSettings } from '@/lib/api';
export { useUpdateSettingsMutation as useUpdateSettings } from '@/hooks/mutations/useSettingMutations';

export function useOrganizationQuery() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: apiGetSettings,
  });
}
