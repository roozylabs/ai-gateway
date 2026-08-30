'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PermissionProvider } from '@/components/PermissionProvider';
import { DashboardSidebar } from '@/components/layouts/DashboardSidebar';
import { DashboardTopbar } from '@/components/layouts/DashboardTopbar';
import { useSidebarStore } from '@/stores/useSidebarStore';

export function AppLayout({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarStore();

  return (
    <PermissionProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <DashboardSidebar />

        {/* Main Content Area */}
        <div className={cn('flex flex-1 flex-col transition-all duration-200', collapsed ? 'pl-[72px]' : 'pl-[248px]')}>
          <DashboardTopbar />

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </PermissionProvider>
  );
}
