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
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <DashboardSidebar />

        {/* Main Content Area */}
        <div
          className={cn(
            'flex flex-1 flex-col h-screen min-w-0 overflow-hidden transition-all duration-200',
            collapsed ? 'pl-[72px]' : 'pl-[248px]'
          )}
        >
          <DashboardTopbar />

          {/* Page Content - scroll y & x isolated exclusively inside main */}
          <main className="flex-1 overflow-auto min-w-0 p-6">{children}</main>
        </div>
      </div>
    </PermissionProvider>
  );
}
