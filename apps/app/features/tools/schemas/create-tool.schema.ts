import { z } from 'zod';

export const createToolSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  displayName: z.string().optional(),
  description: z.string().min(5, 'Description is required'),
  toolType: z.string().default('webhook'),
  endpointUrl: z.string().url('Valid URL required'),
  authType: z.enum(['none', 'bearer', 'basic', 'header']).default('none'),
  enabled: z.boolean().default(true),
});

export type CreateToolFormValues = z.infer<typeof createToolSchema>;
