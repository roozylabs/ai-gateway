'use client';

import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tooltip } from 'antd';
import { apiGetUserPermissions, ApiUserPermissionsResponse } from '@/lib/api';

interface PermissionContextType {
  roleSlug: string;
  permissions: string[];
  isLoading: boolean;
  hasPermission: (permCode: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  roleSlug: 'developer',
  permissions: ['*'],
  isLoading: false,
  hasPermission: () => true,
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery<ApiUserPermissionsResponse>({
    queryKey: ['user-permissions'],
    queryFn: apiGetUserPermissions,
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });

  const permissions = data?.permissions || ['*'];
  const roleSlug = data?.roleSlug || 'developer';

  const hasPermission = (permCode: string): boolean => {
    if (permissions.includes('*') || roleSlug === 'owner') {
      return true;
    }
    if (permissions.includes(permCode)) {
      return true;
    }
    // Check wildcard scope (e.g. agents:* matches agents:create)
    const parts = permCode.split(':');
    if (parts.length > 1 && permissions.includes(`${parts[0]}:*`)) {
      return true;
    }
    return false;
  };

  return (
    <PermissionContext.Provider value={{ roleSlug, permissions, isLoading, hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission(permCode: string): boolean {
  const { hasPermission } = useContext(PermissionContext);
  return hasPermission(permCode);
}

export function useUserRole(): string {
  const { roleSlug } = useContext(PermissionContext);
  return roleSlug;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
  disabledTooltip,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabledTooltip?: string;
}) {
  const permitted = usePermission(permission);

  if (!permitted) {
    if (disabledTooltip) {
      return (
        <Tooltip title={disabledTooltip || `Required Permission: ${permission}`}>
          <span style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
            {children}
          </span>
        </Tooltip>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
