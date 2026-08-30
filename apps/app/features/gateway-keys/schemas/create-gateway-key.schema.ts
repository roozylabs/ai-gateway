import { z } from 'zod';

export const gatewayKeySchema = z.object({
  name: z.string().min(1, 'Key name is required'),
  providerId: z.string().min(1, 'Please select a provider'),
  rateLimit: z.string().default('100'),
});

export type GatewayKeyFormValues = z.infer<typeof gatewayKeySchema>;

export const createGatewayKeySchema = gatewayKeySchema;
export type CreateGatewayKeyFormValues = GatewayKeyFormValues;
