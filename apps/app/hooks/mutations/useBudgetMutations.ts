import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCreateBudget, apiUpdateBudget, apiDeleteBudget, ApiBudget } from '@/lib/api';

export function useCreateBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ApiBudget>) => apiCreateBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}

export function useUpdateBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiBudget> }) =>
      apiUpdateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}

export function useDeleteBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}

export { useCreateBudgetMutation as useCreateBudget };
export { useUpdateBudgetMutation as useUpdateBudget };
export { useDeleteBudgetMutation as useDeleteBudget };
