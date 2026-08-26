import { useQuery } from '@tanstack/react-query';
import { apiGetUserPermissions, ApiUserPermissionsResponse } from '@/lib/api';

export function useMembersQuery() {
  return useQuery<ApiUserPermissionsResponse>({
    queryKey: ['user-permissions'],
    queryFn: apiGetUserPermissions,
  });
}
