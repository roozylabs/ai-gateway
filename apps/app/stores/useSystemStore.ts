import { create } from 'zustand';

export type SystemStatusType = 'operational' | 'degraded' | 'maintenance';

interface SystemState {
  status: SystemStatusType;
  activeNotificationsCount: number;
  setStatus: (status: SystemStatusType) => void;
  setNotificationsCount: (count: number) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  status: 'operational',
  activeNotificationsCount: 0,
  setStatus: (status: SystemStatusType) => set({ status }),
  setNotificationsCount: (count: number) => set({ activeNotificationsCount: count }),
}));
