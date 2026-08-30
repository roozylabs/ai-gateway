import { api } from './client';
import {
  ApiBillingPlan,
  ApiSubscriptionStatus,
  ApiBillingInvoice,
} from './types/billing';

export async function apiGetBillingPlans(): Promise<ApiBillingPlan[]> {
  const response = await api.get<ApiBillingPlan[]>('/billing/plans');
  return response.data;
}

export async function apiGetActiveSubscription(): Promise<ApiSubscriptionStatus> {
  const response = await api.get<ApiSubscriptionStatus>('/billing/subscription');
  return response.data;
}

export async function apiUpgradeSubscription(planId: string): Promise<ApiSubscriptionStatus> {
  const response = await api.post<ApiSubscriptionStatus>('/billing/subscription', { planId });
  return response.data;
}

export async function apiGetInvoices(): Promise<ApiBillingInvoice[]> {
  const response = await api.get<ApiBillingInvoice[]>('/billing/invoices');
  return response.data;
}
