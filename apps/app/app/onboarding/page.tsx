'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/molecules/Card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/molecules/Form';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { toast } from 'sonner';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { apiCompleteOnboarding } from '@/lib/api';

const onboardingSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
  gatewayKeyName: z.string().min(2, 'Gateway key name must be at least 2 characters'),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organizationName: 'RoozyLabs Enterprise',
      workspaceName: 'Production Environment',
      gatewayKeyName: 'Primary Control Key',
    },
  });

  const onSubmit = async (values: OnboardingValues) => {
    try {
      setLoading(true);
      const res = await apiCompleteOnboarding(values);
      setCreatedKey(res.apiKey);
      setStep(3);
      toast.success('Onboarding complete! Your workspace is ready.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete workspace onboarding';
      toast.error('Onboarding error: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="border-border shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <Badge variant="violet" className="mx-auto mb-2">Step {step} of 3</Badge>
          <CardTitle className="text-xl font-bold tracking-tight">
            {step === 1 ? 'Configure Organization' : step === 2 ? 'Create Gateway Key' : 'Setup Complete!'}
          </CardTitle>
          <CardDescription>
            {step === 1 ? 'Set up your primary enterprise organization & workspace' : step === 2 ? 'Generate your first gateway key for LLM requests' : 'Your workspace and API key are configured and active'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step < 3 ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. RoozyLabs Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="workspaceName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Workspace Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Production Workspace" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="button" variant="prismViolet" className="w-full gap-2 mt-4" onClick={() => setStep(2)}>
                      Continue to Key Setup <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="gatewayKeyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Gateway Key Label</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Primary Production Key" {...field} />
                          </FormControl>
                          <FormDescription>Bound to default workspace for OpenAI/Gemini requests</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                        Back
                      </Button>
                      <Button type="submit" variant="prismViolet" className="flex-1 gap-2" disabled={loading}>
                        {loading ? 'Initializing Workspace...' : 'Complete Setup'}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </Form>
          ) : (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-left">
                <p className="text-muted-foreground text-[10px] uppercase">Generated Gateway Secret Key:</p>
                <p className="font-semibold text-emerald-400 copyable select-all break-all mt-1">
                  {createdKey || 'gw_sk_live_9f81a7b2c3d4e5f6'}
                </p>
              </div>

              <Button variant="prismViolet" className="w-full gap-2 mt-4" onClick={() => router.push('/')}>
                Go to Control Plane Console <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
