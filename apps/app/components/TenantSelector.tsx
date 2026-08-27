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

interface Organization {
  id: string;
  name: string;
}

const mockOrgs: Organization[] = [
  { id: '1', name: 'Default Organization' },
  { id: '2', name: 'RoozyLabs Dev' },
  { id: '3', name: 'Staging Environment' },
];

export function TenantSelector() {
  const { selectedOrg, setSelectedOrg } = useTenantStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 px-2.5 text-xs font-medium">
          <Building2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span className="max-w-[120px] truncate">{selectedOrg}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">
          Active Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mockOrgs.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => setSelectedOrg(org.name)}>
            <span className="flex-1 truncate">{org.name}</span>
            {selectedOrg === org.name && <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
