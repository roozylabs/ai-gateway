'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Label } from '@/components/atoms/Label';
import { Input } from '@/components/atoms/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/molecules/Sheet';
import { useOrganizationQuery, useUpdateSettings } from '@/hooks/queries/useOrganizationQuery';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Settings, Pencil } from 'lucide-react';
import { ApiSetting } from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useOrganizationQuery();
  const updateSettingsMutation = useUpdateSettings();
  const settings: ApiSetting[] = data?.value ?? [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ApiSetting | null>(null);
  const [settingValue, setSettingValue] = useState('');

  const openEditDrawer = (s: ApiSetting) => {
    setEditingSetting(s);
    setSettingValue(s.value);
    setDrawerOpen(true);
  };

  const handleSaveSetting = () => {
    if (!editingSetting) return;
    updateSettingsMutation.mutate(
      { [editingSetting.key]: settingValue },
      {
        onSuccess: () => {
          toast.success(`Setting "${editingSetting.key}" updated`);
          setDrawerOpen(false);
        },
        onError: (err: Error) => toast.error(`Failed to update setting: ${err.message}`),
      }
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Settings & System Configuration"
        description="Manage workspace configurations, organization details, and security defaults."
      />

      {isError && <ErrorState onRetry={refetch} />}

      {!isError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-[#8B5CF6]" />
              <span>Workspace Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading settings...</p>
            ) : settings.length === 0 ? (
              <EmptyState description="No settings configured yet." />
            ) : (
              <div className="space-y-2">
                {settings.map((s, i) => (
                  <div
                    key={s.id ?? `${s.key}-${i}`}
                    className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-3">
                      <span className="text-xs font-semibold text-foreground">{s.key}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate">{s.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.category && <Badge variant="violet">{s.category}</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDrawer(s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Setting</SheetTitle>
            <SheetDescription>Update system configuration key &quot;{editingSetting?.key}&quot;</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="setting-key">Configuration Key</Label>
              <Input id="setting-key" value={editingSetting?.key || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setting-val">Configuration Value</Label>
              <Input
                id="setting-val"
                value={settingValue}
                onChange={(e) => setSettingValue(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              variant="prismViolet"
              onClick={handleSaveSetting}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
