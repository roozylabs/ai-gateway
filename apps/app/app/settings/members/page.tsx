'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Users, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function MembersPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Organization Team Members"
        description="Manage user access roles and team permissions."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Invite Member Drawer')}>
            <Plus className="h-4 w-4" /> Invite Member
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-[#8B5CF6]" />
            <span>Active Team Members</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[#8B5CF6]" />
                <div>
                  <span className="font-bold text-xs text-foreground block">Platform Admin</span>
                  <span className="text-[11px] text-muted-foreground">admin@roozylabs.dev</span>
                </div>
              </div>
              <Badge variant="violet">Organization Owner</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
