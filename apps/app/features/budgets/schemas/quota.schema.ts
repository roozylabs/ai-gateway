import { z } from 'zod';

export const quotaSchema = z.object({
  monthlySpendLimitUsd: z.number().default(0),
  dailySpendLimitUsd: z.number().default(0),
  dailyRequestLimit: z.number().default(0),
  maxConcurrentStreams: z.number().default(0),
});

export type QuotaFormValues = z.infer<typeof quotaSchema>;
