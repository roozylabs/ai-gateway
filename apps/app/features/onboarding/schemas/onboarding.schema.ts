import { z } from 'zod';

export const onboardingSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
  gatewayKeyName: z.string().min(2, 'Gateway key name must be at least 2 characters'),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;
export type OnboardingFormValues = OnboardingValues;
