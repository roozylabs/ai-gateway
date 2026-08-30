import { z } from 'zod';

export const governancePolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required'),
  description: z.string().default(''),
  role: z.string().default(''),
  effect: z.enum(['allow', 'deny']).default('allow'),
  agentPattern: z.string().default('*'),
  modelPattern: z.string().default('*'),
  toolPattern: z.string().default('*'),
  resourcePattern: z.string().default('*'),
  priority: z.number().default(100),
  enabled: z.boolean().default(true),
});

export type GovernancePolicyFormValues = z.infer<typeof governancePolicySchema>;
export const policySchema = governancePolicySchema;
export type PolicyFormValues = GovernancePolicyFormValues;
