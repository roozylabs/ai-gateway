'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Box } from 'lucide-react';

export default function SandboxPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Developer Web Sandbox"
        description="Isolated execution container sandbox for live agent code evaluation and safety boundary testing."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Box className="h-4 w-4 text-[#8B5CF6]" />
            <span>Sandbox Console</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Web Sandbox container active. Execute code blocks and tool calling tests safely.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
