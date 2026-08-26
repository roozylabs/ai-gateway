'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { KeyRound, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function GatewayKeysPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Gateway Keys Management"
        description="Generate and scope API secret keys bound to specific tenant workspaces and spending limits."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Create Gateway Key Drawer')}>
            <Plus className="h-4 w-4" /> Create Gateway Key
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#8B5CF6]" />
            <span>Active Gateway Keys</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Manage live secret keys, key revocation, and tenant quota bounds.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
