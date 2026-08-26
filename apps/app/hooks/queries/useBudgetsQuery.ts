import { useQuery } from '@tanstack/react-query';
import { apiGetBudgets, apiGetBudgetStatus } from '@/lib/api';

export function useBudgetsQuery() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: apiGetBudgets,
  });
}

export function useBudgetStatusQuery() {
  return useQuery({
    queryKey: ['budget-status'],
    queryFn: apiGetBudgetStatus,
  });
}
