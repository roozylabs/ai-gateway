'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/molecules/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/molecules/Tabs';
import { Progress } from '@/components/atoms/Progress';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { useBudgetsQuery } from '@/hooks/queries/useBudgetsQuery';
import { ErrorState } from '@/components/molecules/StateAlerts';
import { Wallet, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function BudgetsPage() {
  const { data, isLoading, isError, refetch } = useBudgetsQuery();

  const firstBudget = data?.[0];
  const spentUsd = 182.42;
  const limitUsd = firstBudget?.monthlyLimit ?? 1000.0;
  const percentUsed = Math.min(100, Math.round((spentUsd / (limitUsd || 1)) * 100));

  return (
    <AppLayout>
      <PageHeader
        title="Budgets & Multi-Tenant Quotas"
        description="Set spend caps, token rate limits, and threshold notifications across Organizations, Workspaces, Agents, and Users."
        extra={
          <Button variant="prismViolet" size="sm" className="gap-1.5" onClick={() => toast.info('Create Budget Limit Drawer')}>
            <Plus className="h-4 w-4" /> Create Budget Limit
          </Button>
        }
      />

      <Tabs defaultValue="budgets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budgets">Global Budgets</TabsTrigger>
          <TabsTrigger value="quotas">Multi-Tenant Quotas</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-4">
          {isError ? (
            <ErrorState
              title="Failed to load budget data"
              description="Could not connect to Prism Metering & Billing engine."
              onRetry={refetch}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[#8B5CF6]" />
                      <span>Monthly Organization Budget</span>
                    </CardTitle>
                    <Badge variant={percentUsed > 80 ? 'destructive' : 'success'}>
                      {100 - percentUsed}% Available
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-bold text-foreground">
                      ${spentUsd.toFixed(2)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Limit: ${limitUsd.toFixed(2)} / month
                    </span>
                  </div>
                  <Progress value={isLoading ? 0 : percentUsed} />
                  <p className="text-xs text-muted-foreground">
                    Resets in 5 days. Notification email triggers at 80% threshold ($800.00).
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Workspace Token & Request Rate Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Configured rate limits for Production, Staging, and Development workspaces.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
