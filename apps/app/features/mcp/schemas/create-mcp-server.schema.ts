import { z } from 'zod';

export const mcpServerSchema = z
  .object({
    name: z.string().min(1, 'Server Identifier Name is required'),
    displayName: z.string().default(''),
    description: z.string().default(''),
    type: z.enum(['remote', 'local']),
    transportType: z.string().default('http'),
    endpointUrl: z.string().default(''),
    authToken: z.string().default(''),
    command: z.string().default(''),
    argsCsv: z.string().default(''),
    headerRows: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
    envRows: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
    enabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'remote' && !data.endpointUrl.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endpointUrl'],
        message: 'Endpoint URL is required for remote MCP servers',
      });
    }
    if (data.type === 'local' && !data.command.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['command'],
        message: 'Command is required for local MCP servers',
      });
    }
  });

export type MCPServerFormValues = z.infer<typeof mcpServerSchema>;
export const createMcpServerSchema = mcpServerSchema;
export type CreateMcpServerFormValues = MCPServerFormValues;
