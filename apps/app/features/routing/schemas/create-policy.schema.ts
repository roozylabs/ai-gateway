import { z } from 'zod';

export const policySchema = z.object({
  name: z.string().min(1, 'Policy name is required'),
  quality: z.number().default(40),
  cost: z.number().default(30),
  speed: z.number().default(20),
});

export type PolicyFormValues = z.infer<typeof policySchema>;
export const createPolicySchema = policySchema;
export type CreatePolicyFormValues = PolicyFormValues;
