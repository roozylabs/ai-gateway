import { z } from 'zod';

export const agentSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  displayName: z.string().default(''),
  description: z.string().default(''),
  agentType: z.string().default('general'),
  maxBudgetCents: z.number().default(0),
  allowedTools: z.array(z.string()).default([]),
  allowedResources: z.array(z.string()).default([]),
  allowedMcpServers: z.array(z.string()).default([]),
});

export type AgentFormValues = z.infer<typeof agentSchema>;
