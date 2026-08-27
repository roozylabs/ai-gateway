import { z } from 'zod';

export const createProviderSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  providerType: z.string().min(1, 'Provider type is required'),
  baseUrl: z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
