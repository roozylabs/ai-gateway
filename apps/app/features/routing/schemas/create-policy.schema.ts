import { z } from 'zod';

export const createPolicySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  strategy: z.enum(['latency', 'cost', 'balanced', 'fallback']).default('balanced'),
  description: z.string().optional(),
  targetModels: z.array(z.string()).min(1, 'Select at least one target model'),
  fallbackPolicyId: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type CreatePolicyFormValues = z.infer<typeof createPolicySchema>;
