import { z } from 'zod';

export const createGatewayKeySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  keyPrefix: z.string().optional(),
  allowedModels: z.array(z.string()).default([]),
  maxBudgetCents: z.number().int().nonnegative().default(0),
  rateLimitRpm: z.number().int().positive().default(60),
  expiresAt: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type CreateGatewayKeyFormValues = z.infer<typeof createGatewayKeySchema>;
