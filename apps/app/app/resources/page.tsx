'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Database, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function ResourcesPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Resource Gateway & Knowledge Sources"
        description="Connect document stores, vector databases, and static resources for context injection."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Add Resource Drawer')}>
            <Plus className="h-4 w-4" /> Add Resource Source
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-[#8B5CF6]" />
            <span>Connected Resources & Vector Stores</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Manage vector embeddings, document indexes, and context retrieval policies.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
