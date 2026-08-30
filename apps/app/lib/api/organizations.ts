import { api } from './client';
import { ApiOrganization } from './types/common';

export async function apiGetOrganizations(): Promise<ApiOrganization[]> {
  const response = await api.get<ApiOrganization[] | { data: ApiOrganization[] }>('/user/organizations');
  if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return (response.data as ApiOrganization[]) || [];
}
