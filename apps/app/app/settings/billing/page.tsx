'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { CreditCard, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Billing & Subscription Plans"
        description="Manage multi-tier gateway subscriptions, payment methods, and billing invoice history."
      />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="flex flex-col justify-between border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Developer</CardTitle>
            <CardDescription>Ideal for indie hackers & small prototypes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="font-mono text-3xl font-bold">$0 <span className="text-xs text-muted-foreground font-normal">/ month</span></div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> 100,000 requests/mo</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Standard Routing</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> 3 Gateway Keys</li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Button variant="outline" className="w-full text-xs" disabled>Current Plan</Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between border-[#8B5CF6] shadow-md relative">
          <Badge variant="violet" className="absolute -top-2.5 right-4">POPULAR</Badge>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Pro Scale</CardTitle>
            <CardDescription>For growing startups with high LLM volumes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="font-mono text-3xl font-bold">$49 <span className="text-xs text-muted-foreground font-normal">/ month</span></div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#8B5CF6]" /> 5,000,000 requests/mo</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#8B5CF6]" /> prism-auto Smart Routing</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#8B5CF6]" /> Unlimited Keys & Rate Limits</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#8B5CF6]" /> Cryptographic Audit Logs</li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Button variant="prismViolet" className="w-full text-xs" onClick={() => toast.success('Upgraded to Pro Scale Plan!')}>
              Upgrade to Pro Scale
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Enterprise Custom</CardTitle>
            <CardDescription>Dedicated infrastructure & VPC deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="font-mono text-3xl font-bold">Custom</div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-500" /> Unlimited Requests</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-500" /> On-Premise Go Proxy Engine</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-500" /> 99.99% SLA Guarantee</li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Button variant="outline" className="w-full text-xs" onClick={() => toast.info('Contacting Sales Team...')}>Contact Sales</Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
