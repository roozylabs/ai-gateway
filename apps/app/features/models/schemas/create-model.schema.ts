import { z } from 'zod';

const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number().optional()
);

export const modelSchema = z.object({
  providerId: z.string().min(1, 'Provider is required'),
  name: z.string().min(1, 'Model name is required'),
  slug: z.string().min(1, 'Slug is required'),
  displayName: z.string().default(''),
  inputPricePer1M: optionalNumber,
  outputPricePer1M: optionalNumber,
  qualityScore: optionalNumber,
  speedScore: optionalNumber,
});

export type ModelFormValues = z.infer<typeof modelSchema>;
export const createModelSchema = modelSchema;
export type CreateModelFormValues = ModelFormValues;
