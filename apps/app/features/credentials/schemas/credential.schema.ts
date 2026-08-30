import { z } from 'zod';

export const credentialSchema = z.object({
  providerId: z.string().min(1, 'Provider is required'),
  name: z.string().min(1, 'Credential label is required'),
  apiKey: z.string().min(1, 'API key is required'),
});

export type CredentialFormValues = z.infer<typeof credentialSchema>;
export const createCredentialSchema = credentialSchema;
export type CreateCredentialFormValues = CredentialFormValues;
