'use client';

import { useEffect } from 'react';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/molecules/DropdownMenu';
import { Button } from '@/components/atoms/Button';
import { useTenantStore } from '@/stores/useTenantStore';
import { useOrganizationsQuery } from '@/hooks/queries/useOrganizationsQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGetUserPermissions, ApiUserPermissionsResponse } from '@/lib/api/auth';

export function TenantSelector() {
  const queryClient = useQueryClient();
  const { selectedOrgId, selectedOrgName, setSelectedOrg } = useTenantStore();
  const { data: orgs, isLoading: isLoadingOrgs } = useOrganizationsQuery();
  const { data: userPerms, isLoading: isLoadingPerms } = useQuery<ApiUserPermissionsResponse>({
    queryKey: ['user-permissions'],
    queryFn: apiGetUserPermissions,
    staleTime: 60 * 1000,
  });

  const isLoading = isLoadingOrgs || isLoadingPerms;

  // Authoritatively sync tenant from user token / API response
  useEffect(() => {
    if (!isLoading && orgs && orgs.length > 0) {
      const isSelectedValid = selectedOrgId && orgs.some((o) => o.id === selectedOrgId);
      if (!isSelectedValid) {
        // Preference: match user's session organizationId from token/permissions, otherwise first available org
        const targetOrg = (userPerms?.organizationId && orgs.find((o) => o.id === userPerms.organizationId)) || orgs[0];
        setSelectedOrg(targetOrg.id, targetOrg.name);
      } else {
        // Ensure name is up to date
        const currentOrg = orgs.find((o) => o.id === selectedOrgId);
        if (currentOrg && currentOrg.name !== selectedOrgName) {
          setSelectedOrg(currentOrg.id, currentOrg.name);
        }
      }
    }
  }, [isLoading, orgs, userPerms, selectedOrgId, selectedOrgName, setSelectedOrg]);

  const handleSelectOrg = (orgId: string, orgName: string) => {
    if (orgId === selectedOrgId) return;
    setSelectedOrg(orgId, orgName);
    // Invalidate tenant-dependent caches to refresh views for the new organization
    queryClient.invalidateQueries();
  };

  const currentDisplayName = selectedOrgName || (orgs?.find((o) => o.id === selectedOrgId)?.name) || null;

  if (isLoading && !currentDisplayName) {
    return (
      <Button variant="outline" size="sm" className="h-8 gap-2 px-2.5 text-xs font-medium opacity-70" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span className="max-w-[120px] truncate">Loading tenant...</span>
      </Button>
    );
  }

  if (!orgs || orgs.length === 0) {
    return (
      <Button variant="outline" size="sm" className="h-8 gap-2 px-2.5 text-xs font-medium opacity-60" disabled>
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[120px] truncate">No Organization</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 px-2.5 text-xs font-medium">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[140px] truncate">{currentDisplayName || 'Select Organization'}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">
          Active Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => {
          const isSelected = org.id === selectedOrgId;
          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSelectOrg(org.id, org.name)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col max-w-[190px]">
                <span className="truncate text-xs font-medium">{org.name}</span>
                {org.slug && <span className="truncate text-[10px] text-muted-foreground font-mono">{org.slug}</span>}
              </div>
              {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
