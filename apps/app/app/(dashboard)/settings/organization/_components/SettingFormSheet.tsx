"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from "@/components/molecules/Sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/molecules/Form";
import { useUpdateSettings } from "@/hooks/queries/useOrganizationQuery";
import type { ApiSetting } from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

const parameterSchema = z.object({
  value: z.string().min(1, "Parameter value is required"),
});

type ParameterFormValues = z.infer<typeof parameterSchema>;

interface SettingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSetting: ApiSetting | null;
}

export function SettingFormSheet({ open, onOpenChange, editingSetting }: SettingFormSheetProps) {
  const updateSettingsMutation = useUpdateSettings();

  const form = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterSchema),
    defaultValues: { value: "" },
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset({ value: editingSetting?.value ?? "" });
  }, [open, editingSetting, reset]);

  const onSubmit = (values: ParameterFormValues) => {
    if (!editingSetting) return;
    updateSettingsMutation.mutate(
      { [editingSetting.key]: values.value },
      {
        onSuccess: () => {
          toast.success(`Organization parameter "${editingSetting.key}" updated`);
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(`Failed to update: ${getErrorMessage(err)}`),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Organization Parameter</SheetTitle>
          <SheetDescription>
            Update parameter &quot;{editingSetting?.key}&quot;
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <FormLabel>Parameter Key</FormLabel>
              <Input value={editingSetting?.key || ""} disabled />
            </div>
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel required>Parameter Value</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={updateSettingsMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateSettingsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="prismViolet"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Parameter"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
