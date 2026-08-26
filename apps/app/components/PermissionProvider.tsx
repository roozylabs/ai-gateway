'use client';

import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGetUserPermissions, ApiUserPermissionsResponse } from '@/lib/api';
import { UserRole } from '@/types/roles';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/atoms/Tooltip';

interface PermissionContextType {
  role: UserRole;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  role: UserRole.OWNER,
  permissions: [],
  hasPermission: () => true,
  isLoading: false,
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery<ApiUserPermissionsResponse>({
    queryKey: ['user-permissions'],
    queryFn: apiGetUserPermissions,
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

  const hasPermission = (perm: string): boolean => {
    if (role === UserRole.OWNER || role === UserRole.ADMIN) return true;
    return permissions.includes(perm);
  };

  return (
    <PermissionContext.Provider value={{ role, permissions, hasPermission, isLoading }}>
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
