'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Settings } from 'lucide-react';

export default function SettingsOrganizationPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Organization & System Settings"
        description="Configure organization details, default workspace parameters, and notification webhooks."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#8B5CF6]" />
            <span>Organization Parameters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Manage organization name, security enforcement policies, and telemetry.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
