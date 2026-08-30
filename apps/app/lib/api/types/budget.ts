export interface ApiBudget {
  id: string;
  name: string;
  amountUSD: number;
  monthlyLimit?: number;
  dailyLimit?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  hardLimit?: boolean;
  period: 'daily' | 'monthly' | 'yearly';
  scopeType: 'global' | 'provider' | 'key' | 'model';
  scopeValue?: string;
  alertThresholdPct?: number;
  action: 'block' | 'alert_only';
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiBudgetStatus {
  budgetId?: string;
  id?: string;
  name: string;
  amountUSD?: number;
  budget?: number;
  currentSpendUSD?: number;
  monthlySpent?: number;
  spendPercentage?: number;
  usagePercent?: number;
  isExceeded?: boolean;
  status: 'normal' | 'warning' | 'critical' | 'exceeded';
  projectedOverspendUSD?: number;
}
