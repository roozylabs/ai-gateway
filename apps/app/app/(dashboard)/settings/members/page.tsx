'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { useMembersQuery } from '@/hooks/queries/useMembersQuery';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Users, Shield, UserPlus, Mail, Calendar } from 'lucide-react';
import { InviteMemberSheet } from './_components/InviteMemberSheet';

export default function MembersPage() {
  const { data: members, isLoading, isError, refetch } = useMembersQuery();
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
              <span>Active Team Members ({members?.length || 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading members...</p>
            ) : !members || members.length === 0 ? (
              <EmptyState description="No active team members found." />
            ) : (
              <div className="divide-y divide-border">
                {members.map((member) => (
                  <div key={member.id || member.userId} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {member.userName || member.userEmail || member.userId}
                          </span>
                          <Badge variant={member.role === 'owner' ? 'violet' : member.role === 'admin' ? 'default' : 'outline'} className="text-[10px] capitalize">
                            {member.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                          {member.userEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {member.userEmail}
                            </span>
                          )}
                          {member.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Joined {new Date(member.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <InviteMemberSheet open={drawerOpen} onOpenChange={setDrawerOpen} onInviteSuccess={refetch} />
    </AppLayout>
  );
}
