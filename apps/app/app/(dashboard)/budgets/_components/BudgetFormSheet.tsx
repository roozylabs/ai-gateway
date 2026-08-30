"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Switch } from "@/components/atoms/Switch";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from "@/components/molecules/Sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/molecules/Form";
import { useCreateBudget } from "@/hooks/queries/useBudgetsQuery";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

import { budgetSchema, BudgetFormValues } from "@/features/budgets/schemas/budget.schema";

const defaultValues: BudgetFormValues = {
  name: "",
  monthlyLimit: "",
  dailyLimit: "",
  hardLimit: true,
  warningThreshold: "80",
  criticalThreshold: "95",
};

interface BudgetFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetFormSheet({ open, onOpenChange }: BudgetFormSheetProps) {
  const createMutation = useCreateBudget();

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onSubmit = (values: BudgetFormValues) => {
    createMutation.mutate(
      {
        name: values.name.trim(),
        monthlyLimit: parseFloat(values.monthlyLimit),
        dailyLimit: values.dailyLimit ? parseFloat(values.dailyLimit) : 0,
        hardLimit: values.hardLimit,
        warningThreshold: parseFloat(values.warningThreshold) || 80,
        criticalThreshold: parseFloat(values.criticalThreshold) || 95,
        enabled: true,
      },
      {
        onSuccess: () => {
          toast.success("Budget created successfully");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(`Failed to create budget: ${getErrorMessage(err)}`),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Budget Limit</SheetTitle>
          <SheetDescription>
            Set a new spending cap with threshold notifications.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Organization Monthly Cap"
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyLimit"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Monthly Limit ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="1000.00"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dailyLimit"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Daily Limit ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Optional"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="hardLimit"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel>Hard Limit</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Block requests when limit is exceeded
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warningThreshold"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Warning Threshold (%)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="80"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="criticalThreshold"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Critical Threshold (%)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="95"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="prismViolet"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Budget"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
