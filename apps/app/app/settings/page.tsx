'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { useOrganizationQuery } from '@/hooks/queries/useOrganizationQuery';
import { ErrorState, EmptyState } from '@/components/molecules/StateAlerts';
import { Settings } from 'lucide-react';
import { ApiSetting } from '@/lib/api';
import { Badge } from '@/components/atoms/Badge';

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useOrganizationQuery();
  const settings: ApiSetting[] = data?.value ?? [];

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
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground">{s.key}</span>
                      <span className="text-xs text-muted-foreground font-mono">{s.value}</span>
                    </div>
                    {s.category && <Badge variant="violet">{s.category}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
