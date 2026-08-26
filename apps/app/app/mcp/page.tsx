'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge, StatusDot } from '@/components/atoms/Badge';
import { Globe, Plus, Cpu, Terminal } from 'lucide-react';
import { toast } from 'sonner';

export default function MCPPage() {
  return (
    <AppLayout>
      <PageHeader
        title="MCP (Model Context Protocol) Server Gateway"
        description="Connect and expose Model Context Protocol tool servers to your AI agents and LLM clients."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Connect MCP Server Drawer')}>
            <Plus className="h-4 w-4" /> Connect MCP Server
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#8B5CF6]" />
                <span>PostgreSQL MCP Database Server</span>
              </CardTitle>
              <StatusDot status="healthy" />
            </div>
            <CardDescription className="font-mono text-xs">mcp://localhost:8080/postgres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Exposed Tools</span>
              <span className="font-mono font-bold text-foreground">6 tools (query_db, describe_table, list_schemas)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Security Boundary</span>
              <Badge variant="violet">ReadOnly Enforcement</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
