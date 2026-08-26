'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Settings & System Configuration"
        description="Manage workspace configurations, organization details, and security defaults."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#8B5CF6]" />
            <span>Workspace Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Configure system parameters, notification webhooks, and routing defaults.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
