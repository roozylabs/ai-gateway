import { z } from 'zod';

export const budgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  monthlyLimit: z.string().min(1, 'Monthly limit is required'),
  dailyLimit: z.string().default(''),
  hardLimit: z.boolean().default(true),
  warningThreshold: z.string().default('80'),
  criticalThreshold: z.string().default('95'),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;
