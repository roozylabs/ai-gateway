'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import { Bot, Plus, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Agent Gateway & Agent Catalog"
        description="Provision autonomous AI agent identities with bound system prompts, tool boundaries, and key quotas."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Instantiate Agent Drawer')}>
            <Plus className="h-4 w-4" /> Instantiate New Agent
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#8B5CF6]" />
                <span>DevOps Auto-Remediator</span>
              </CardTitle>
              <StatusDot status="healthy" />
            </div>
            <CardDescription className="font-mono text-xs">agent_id: agent-devops-01</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Default Model</span>
              <Badge variant="outline">claude-3-7-sonnet</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Bound Tools</span>
              <span className="font-mono text-foreground font-semibold">4 tools (k8s_restart, fetch_logs)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Spend Cap</span>
              <span className="font-mono text-emerald-500 font-bold">$200.00 / mo</span>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-3">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info('Configuring agent...')}>
              Configure Agent
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
