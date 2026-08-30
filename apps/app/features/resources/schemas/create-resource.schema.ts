import { z } from 'zod';

export const resourceSchema = z.object({
  name: z.string().min(1, 'Resource name is required'),
  displayName: z.string().default(''),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
});

export type ResourceFormValues = z.infer<typeof resourceSchema>;
export const createResourceSchema = resourceSchema;
export type CreateResourceFormValues = ResourceFormValues;
