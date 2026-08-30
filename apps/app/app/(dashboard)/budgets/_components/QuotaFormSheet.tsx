"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from "@/components/molecules/Sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/molecules/Form";
import { useUpdateQuota } from "@/hooks/queries/useQuotasQuery";
import type { ApiTenantQuota } from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

import { quotaSchema, QuotaFormValues } from "@/features/budgets/schemas/quota.schema";

const defaultValues: QuotaFormValues = {
  monthlySpendLimitUsd: 0,
  dailySpendLimitUsd: 0,
  dailyRequestLimit: 0,
  maxConcurrentStreams: 0,
};

interface QuotaFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingQuota: ApiTenantQuota | null;
}

export function QuotaFormSheet({ open, onOpenChange, editingQuota }: QuotaFormSheetProps) {
  const updateQuotaMutation = useUpdateQuota();

  const form = useForm<QuotaFormValues>({
    resolver: zodResolver(quotaSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    if (!editingQuota) {
      reset(defaultValues);
      return;
    }
    reset({
      monthlySpendLimitUsd: editingQuota.monthlySpendLimitUsd ?? editingQuota.maxMonthlySpendUsd ?? 0,
      dailySpendLimitUsd: editingQuota.dailySpendLimitUsd ?? 0,
      dailyRequestLimit: editingQuota.dailyRequestLimit ?? editingQuota.maxDailyRequests ?? 0,
      maxConcurrentStreams: editingQuota.maxConcurrentStreams ?? 0,
    });
  }, [open, editingQuota, reset]);

  const onSubmit = (values: QuotaFormValues) => {
    if (!editingQuota) return;
    updateQuotaMutation.mutate(
      {
        targetType: editingQuota.targetType,
        targetId: editingQuota.targetId,
        data: {
          monthlySpendLimitUsd: values.monthlySpendLimitUsd || 0,
          dailySpendLimitUsd: values.dailySpendLimitUsd || 0,
          dailyRequestLimit: values.dailyRequestLimit || 0,
          maxConcurrentStreams: values.maxConcurrentStreams || 0,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            `Quota for ${editingQuota.targetType}:${editingQuota.targetId} updated`,
          );
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(`Quota update failed: ${getErrorMessage(err)}`),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Quota Limits</SheetTitle>
          <SheetDescription>
            Update rate and spend limits for {editingQuota?.targetType}:
            {editingQuota?.targetId}.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlySpendLimitUsd"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Monthly Spend Limit ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={updateQuotaMutation.isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dailySpendLimitUsd"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Daily Spend Limit ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={updateQuotaMutation.isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dailyRequestLimit"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Daily Request Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={updateQuotaMutation.isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxConcurrentStreams"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Max Concurrent Streams</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={updateQuotaMutation.isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateQuotaMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="prismViolet"
                disabled={updateQuotaMutation.isPending}
              >
                {updateQuotaMutation.isPending ? "Saving..." : "Update Quota"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
