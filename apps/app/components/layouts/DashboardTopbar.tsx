'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { StatusDot } from '@/components/atoms/Badge';
import { TenantSelector } from '@/components/TenantSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/molecules/DropdownMenu';
import { useSSE } from '@/context/SSEContext';
import { useAuth } from '@/context/AuthContext';
import { AppRoutes } from '@/constants/routes';
import { Settings, Building, CreditCard, LogOut, Users } from 'lucide-react';

function getUserInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'PA';
}

export function DashboardTopbar() {
  const { isConnected: isSseConnected } = useSSE();
  const { user, logout } = useAuth();

  console.log('user',user)

  const systemStatus = isSseConnected ? 'operational' : 'degraded';
  const systemStatusLabel = isSseConnected ? 'System operational' : 'System degraded';

  const displayName = user?.name || user?.email?.split('@')[0] || 'Prism Admin';
  const email = user?.email || 'admin@prism.local';
  const role = user?.role || 'Admin';
  const initials = getUserInitials(user?.name, user?.email);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <TenantSelector />
        <StatusDot status={systemStatus} label={systemStatusLabel} />
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center rounded-full p-0.5 transition-all hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
              aria-label="User account menu"
            >
              <Avatar className="h-8 w-8">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-[#7C3AED] text-white text-xs font-bold font-mono">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end" sideOffset={6}>
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none text-foreground truncate">{displayName}</p>
                <p className="text-[11px] leading-none text-muted-foreground truncate">{email}</p>
                <div className="pt-1">
                  <span className="inline-flex items-center rounded-none px-1.5 py-0.5 text-[10px] font-medium font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>General Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={AppRoutes.SETTINGS} className="flex items-center gap-2 cursor-pointer">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Organization</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={AppRoutes.SETTINGS_MEMBERS} className="flex items-center gap-2 cursor-pointer">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Team Members</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={AppRoutes.BILLING} className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Billing & Plans</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => logout()}
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
