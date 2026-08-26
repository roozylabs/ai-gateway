'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AppRoutes } from '@/constants/routes';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/molecules/Card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/molecules/Form';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { apiLogin } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@roozylabs.dev',
      password: '',
    },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      setLoading(true);
      await apiLogin({ email: values.email, password: values.password });
      toast.success('Authentication successful! Welcome to RoozyLabs Prism.');
      router.push(AppRoutes.HOME);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="border-border shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-bold tracking-tight">Sign in to Prism Console</CardTitle>
          <CardDescription>
            Enter your credentials to access your universal AI control plane
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@roozylabs.dev" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" variant="prismViolet" className="w-full gap-2 mt-2" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In to Console'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-mono">Enterprise SSO</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info('Initiating Google OAuth2...')}>
              Google OAuth2
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info('Initiating GitHub OAuth2...')}>
              GitHub OAuth2
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
