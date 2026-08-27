import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  resourceType: z.enum(['postgres', 'graphql', 'rest', 's3']).default('postgres'),
  connectionUri: z.string().min(5, 'Connection URI or endpoint is required'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type CreateResourceFormValues = z.infer<typeof createResourceSchema>;
