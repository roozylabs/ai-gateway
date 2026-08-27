'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Label } from '@/components/atoms/Label';
import { Input } from '@/components/atoms/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/molecules/Select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/molecules/Sheet';
import { useMembersQuery } from '@/hooks/queries/useMembersQuery';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Users, Shield, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function MembersPage() {
  const { data, isLoading, isError, refetch } = useMembersQuery();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [isSending, setIsSending] = useState(false);

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Email address is required');
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      toast.success(`Invitation sent to ${inviteEmail} with role "${inviteRole}"`);
      setIsSending(false);
      setDrawerOpen(false);
      setInviteEmail('');
    }, 500);
  };

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
              <Users className="h-4 w-4 text-[#8B5CF6]" />
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
                    <Shield className="h-4 w-4 text-[#8B5CF6]" />
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

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite Organization Member</SheetTitle>
            <SheetDescription>Send an invitation email with specified RBAC role.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Organization Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="viewer">Read-Only Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleSendInvite}
              disabled={isSending || !inviteEmail.trim()}
            >
              {isSending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
