import { z } from 'zod';

export const providerSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.string().min(1, 'Provider type is required'),
  baseUrl: z.string().default(''),
});

export type ProviderFormValues = z.infer<typeof providerSchema>;
export const createProviderSchema = providerSchema;
export type CreateProviderFormValues = ProviderFormValues;
