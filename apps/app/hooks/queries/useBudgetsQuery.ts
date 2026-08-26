import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetBudgets, apiGetBudgetStatus, apiCreateBudget, apiUpdateBudget, apiDeleteBudget } from '@/lib/api';
import type { ApiBudget } from '@/lib/api';

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

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ApiBudget>) => apiCreateBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Partial<ApiBudget> }) => apiUpdateBudget(args.id, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}
