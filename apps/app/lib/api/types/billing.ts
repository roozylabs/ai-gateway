export interface ApiTenantQuota {
  id: string;
  targetType: 'organization' | 'workspace' | 'project';
  targetId: string;
  name?: string;
  maxMonthlySpendUsd: number;
  monthlySpendLimitUsd?: number;
  dailySpendLimitUsd?: number;
  currentSpendUsd: number;
  maxDailyRequests: number;
  dailyRequestLimit?: number;
  maxTokensPerMinute: number;
  maxConcurrentStreams?: number;
  enforceHardLimit: boolean;
  alertThresholdPct: number;
}

export interface ApiBillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthlyCents: number;
  includedTokensMonthly: number;
  includedWorkspaces: number;
  hasSLA: boolean;
  features: string[];
  isPopular?: boolean;
}

export interface ApiSubscriptionStatus {
  planId: string;
  planName: string;
  planSlug: string;
  status: 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface ApiBillingInvoice {
  id: string;
  invoiceNumber: string;
  amountDueUsd: number;
  amountPaidUsd: number;
  status: 'paid' | 'open' | 'void';
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  pdfUrl?: string;
}
