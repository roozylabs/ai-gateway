import { z } from 'zod';

export const sandboxSchema = z.object({
  model: z.string().min(1, 'Target model is required'),
  routingPolicy: z.string().min(1, 'Routing policy is required'),
  keyPrefix: z.string().min(1, 'Gateway API Key Context is required'),
  agentId: z.string().default('default'),
  enableStream: z.boolean().default(true),
  enableAsync: z.boolean().default(false),
  userPrompt: z.string().min(1, 'Prompt / Code Instruction is required'),
});

export type SandboxFormValues = z.infer<typeof sandboxSchema>;
