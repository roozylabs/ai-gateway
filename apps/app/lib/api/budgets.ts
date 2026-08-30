import { api } from './client';
import { ApiBudget, ApiBudgetStatus } from './types/budget';

export async function apiGetBudgets(): Promise<ApiBudget[]> {
  const response = await api.get<ApiBudget[]>('/budgets');
  return response.data;
}

export async function apiGetBudgetStatus(): Promise<ApiBudgetStatus[]> {
  const response = await api.get<ApiBudgetStatus[]>('/budgets/status');
  return response.data;
}

export async function apiCreateBudget(data: Partial<ApiBudget>): Promise<ApiBudget> {
  const response = await api.post<ApiBudget>('/budgets', data);
  return response.data;
}

export async function apiUpdateBudget(id: string, data: Partial<ApiBudget>): Promise<ApiBudget> {
  const response = await api.put<ApiBudget>(`/budgets/${id}`, data);
  return response.data;
}

export async function apiDeleteBudget(id: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/budgets/${id}`);
  return response.data;
}
