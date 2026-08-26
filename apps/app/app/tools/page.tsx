'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Wrench, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function ToolsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Tool Gateway & Security Boundaries"
        description="Register executable tools, API functions, and security sandboxes for LLM function calling."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Register Tool Drawer')}>
            <Plus className="h-4 w-4" /> Register Tool
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#8B5CF6]" />
            <span>Registered Gateway Tools</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Manage function calling schema parameters and permission policies.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
