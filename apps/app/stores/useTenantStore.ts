import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  selectedOrg: string;
  selectedWorkspaceId: string;
  setSelectedOrg: (org: string) => void;
  setSelectedWorkspaceId: (workspaceId: string) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      selectedOrg: 'Default Organization',
      selectedWorkspaceId: 'ws-prod-primary',
      setSelectedOrg: (org: string) => set({ selectedOrg: org }),
      setSelectedWorkspaceId: (workspaceId: string) => set({ selectedWorkspaceId: workspaceId }),
    }),
    {
      name: 'prism-tenant-storage',
    }
  )
);
