'use client';

import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { StatusDot } from '@/components/atoms/Badge';
import { TenantSelector } from '@/components/TenantSelector';
import { Avatar, AvatarFallback } from '@/components/atoms/Avatar';
import { useSSE } from '@/context/SSEContext';

export function DashboardTopbar() {
  const { isConnected: isSseConnected } = useSSE();

  const systemStatus = isSseConnected ? 'operational' : 'degraded';
  const systemStatusLabel = isSseConnected ? 'System operational' : 'System degraded';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <TenantSelector />
        <StatusDot status={systemStatus} label={systemStatusLabel} />
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[#8B5CF6] text-white text-xs font-bold">
            PA
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
