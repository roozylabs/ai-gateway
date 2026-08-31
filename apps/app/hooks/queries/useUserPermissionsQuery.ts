import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiGetUserPermissions, ApiUserPermissionsResponse } from '@/lib/api';

export function useUserPermissionsQuery(options?: Partial<UseQueryOptions<ApiUserPermissionsResponse>>) {
  return useQuery<ApiUserPermissionsResponse>({
    queryKey: ['user-permissions'],
    queryFn: apiGetUserPermissions,
    staleTime: 60 * 1000,
    retry: 1,
    ...options,
  });
}
