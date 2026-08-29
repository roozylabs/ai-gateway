'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { useMembersQuery } from '@/hooks/queries/useMembersQuery';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Users, Shield, UserPlus } from 'lucide-react';
import { InviteMemberSheet } from './_components/InviteMemberSheet';

export default function MembersPage() {
  const { data, isLoading, isError, refetch } = useMembersQuery();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AppLayout>
      <PageHeader
        title="Organization Team Members"
        description="Manage user access roles and team permissions."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => setDrawerOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite Member
          </Button>
        }
      />

      {isError && <ErrorState onRetry={refetch} />}

      {!isError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Active Team Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading members...</p>
            ) : !data ? (
              <EmptyState description="No member data available." />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-bold text-xs text-foreground block">{data.primaryRole || data.roleSlug}</span>
                      <span className="text-[11px] text-muted-foreground">User ID: {data.userId}</span>
                    </div>
                  </div>
                  <Badge variant="violet">{data.roleSlug}</Badge>
                </div>

                <div className="mt-4">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Permissions ({data.permissions.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.permissions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No explicit permissions</span>
                    ) : (
                      data.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-[11px]">{perm}</Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-muted-foreground">
                  Organization ID: <span className="font-mono">{data.organizationId}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <InviteMemberSheet open={drawerOpen} onOpenChange={setDrawerOpen} />
    </AppLayout>
  );
}
