import { useQuery } from '@tanstack/react-query';
import { apiGetOrganizationMembers } from '@/lib/api/organizations';
import { ApiOrganizationMember } from '@/lib/api/types/common';

export function useMembersQuery() {
  return useQuery<ApiOrganizationMember[]>({
    queryKey: ['organization-members'],
    queryFn: apiGetOrganizationMembers,
  });
}
