'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ApiUserPermissionsResponse } from '@/lib/api';
import { useUserPermissionsQuery } from '@/hooks/queries/useUserPermissionsQuery';
import { UserRole } from '@/types/roles';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/atoms/Tooltip';

interface PermissionContextType {
  role: UserRole;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  isLoading: boolean;
  isOnboarded: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  role: UserRole.OWNER,
  permissions: [],
  hasPermission: () => true,
  isLoading: false,
  isOnboarded: true,
});

export function PermissionProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: ApiUserPermissionsResponse | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading } = useUserPermissionsQuery({
    initialData: initialData ?? undefined,
  });

  const rawRole = (data?.primaryRole || data?.roleSlug || 'owner').toLowerCase();
  const role: UserRole =
    rawRole === 'admin'
      ? UserRole.ADMIN
      : rawRole === 'member'
      ? UserRole.MEMBER
      : rawRole === 'viewer'
      ? UserRole.VIEWER
      : UserRole.OWNER;

  const permissions = data?.permissions || [];
  const isOnboarded = data?.isOnboarded ?? true;

  useEffect(() => {
    if (!isLoading && data) {
      if (data.isOnboarded === false && pathname && !pathname.startsWith('/onboarding') && !pathname.startsWith('/signin')) {
        router.replace('/onboarding');
      }
    }
  }, [data, isLoading, pathname, router]);

  const hasPermission = (perm: string): boolean => {
    if (role === UserRole.OWNER || role === UserRole.ADMIN) return true;
    return permissions.includes(perm);
  };

  return (
    <PermissionContext.Provider value={{ role, permissions, hasPermission, isLoading, isOnboarded }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  return useContext(PermissionContext);
}

export interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabledTooltip?: string;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
  disabledTooltip,
}: PermissionGuardProps) {
  const { hasPermission } = usePermission();
  const allowed = hasPermission(permission);

  if (allowed) {
    return <>{children}</>;
  }

  if (disabledTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-not-allowed opacity-50 pointer-events-none inline-block">
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>{disabledTooltip}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <>{fallback}</>;
}
