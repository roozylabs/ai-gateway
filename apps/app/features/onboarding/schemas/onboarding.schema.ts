import { z } from 'zod';

export const onboardingSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  workspaceName: z.string().min(2, 'Workspace name is required'),
  defaultProvider: z.string().optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
