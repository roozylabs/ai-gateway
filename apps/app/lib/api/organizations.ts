import { api } from './client';
import { ApiOrganization, ApiOrganizationMember } from './types/common';

export async function apiGetOrganizations(): Promise<ApiOrganization[]> {
  const response = await api.get<ApiOrganization[] | { data: ApiOrganization[] }>('/user/organizations');
  if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return (response.data as ApiOrganization[]) || [];
}

export async function apiGetOrganizationMembers(): Promise<ApiOrganizationMember[]> {
  const response = await api.get<{ data: ApiOrganizationMember[] } | ApiOrganizationMember[]>('/organizations/members');
  if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return (response.data as ApiOrganizationMember[]) || [];
}

export async function apiInviteMember(data: { email: string; role: string }): Promise<{ message: string; invite: any }> {
  const response = await api.post<{ message: string; invite: any }>('/organizations/invites', data);
  return response.data;
}

export async function apiUpdateMemberRole(userId: string, role: string): Promise<{ message: string }> {
  const response = await api.put<{ message: string }>(`/organizations/members/${userId}`, { role });
  return response.data;
}

export async function apiRemoveMember(userId: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/organizations/members/${userId}`);
  return response.data;
}
