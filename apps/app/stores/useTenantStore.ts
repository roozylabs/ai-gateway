import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  selectedOrgId: string | null;
  selectedOrgName: string | null;
  selectedWorkspaceId: string | null;
  setSelectedOrg: (orgId: string | null, orgName?: string | null) => void;
  setSelectedWorkspaceId: (workspaceId: string | null) => void;
  resetTenant: () => void;
}

const getInitialOrgId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('org_id');
  }
  return null;
};

const getInitialWsId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('workspace_id');
  }
  return null;
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      selectedOrgId: getInitialOrgId(),
      selectedOrgName: null,
      selectedWorkspaceId: getInitialWsId(),
      setSelectedOrg: (orgId: string | null, orgName: string | null = null) => {
        if (typeof window !== 'undefined') {
          if (orgId) {
            localStorage.setItem('org_id', orgId);
          } else {
            localStorage.removeItem('org_id');
          }
        }
        set({
          selectedOrgId: orgId,
          selectedOrgName: orgName,
        });
      },
      setSelectedWorkspaceId: (workspaceId: string | null) => {
        if (typeof window !== 'undefined') {
          if (workspaceId) {
            localStorage.setItem('workspace_id', workspaceId);
          } else {
            localStorage.removeItem('workspace_id');
          }
        }
        set({ selectedWorkspaceId: workspaceId });
      },
      resetTenant: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('org_id');
          localStorage.removeItem('workspace_id');
        }
        set({
          selectedOrgId: null,
          selectedOrgName: null,
          selectedWorkspaceId: null,
        });
      },
    }),
    {
      name: 'prism-tenant-storage',
    }
  )
);
