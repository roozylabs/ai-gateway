import { z } from 'zod';

export const createMcpServerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  serverUrl: z.string().url('Must be a valid URL'),
  transport: z.enum(['sse', 'stdio', 'websocket']).default('sse'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type CreateMcpServerFormValues = z.infer<typeof createMcpServerSchema>;
