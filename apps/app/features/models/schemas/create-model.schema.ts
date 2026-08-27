import { z } from 'zod';

export const createModelSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2, 'Slug is required'),
  providerId: z.string().min(1, 'Provider is required'),
  contextWindow: z.number().int().positive().default(128000),
  maxTokens: z.number().int().positive().default(4096),
  inputCostPer1k: z.number().nonnegative().default(0),
  outputCostPer1k: z.number().nonnegative().default(0),
  enabled: z.boolean().default(true),
});

export type CreateModelFormValues = z.infer<typeof createModelSchema>;
