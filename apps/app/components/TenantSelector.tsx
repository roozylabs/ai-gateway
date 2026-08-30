'use client';

import { Building2, ChevronDown, Check } from 'lucide-react';
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

export function TenantSelector() {
  const { selectedOrg, setSelectedOrg } = useTenantStore();
  const { data: orgsData, isLoading } = useOrganizationsQuery();

  const orgs = (orgsData && orgsData.length > 0)
    ? orgsData
    : [{ id: 'org_default', name: 'Default Organization' }];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 px-2.5 text-xs font-medium">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[120px] truncate">{selectedOrg || 'Default Organization'}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">
          Active Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="p-2 text-xs text-muted-foreground text-center">Loading organizations...</div>
        ) : (
          orgs.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => setSelectedOrg(org.name)}>
              <span className="flex-1 truncate">{org.name}</span>
              {(selectedOrg === org.name || (!selectedOrg && org.id === 'org_default')) && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
