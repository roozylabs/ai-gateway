"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Slider } from "@/components/atoms/Slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/molecules/Dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/molecules/Form";
import { useCreatePolicy } from "@/hooks/queries/usePoliciesQuery";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

import { policySchema, PolicyFormValues } from "@/features/routing/schemas/create-policy.schema";

const defaultValues: PolicyFormValues = {
  name: "",
  quality: 40,
  cost: 30,
  speed: 20,
};

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PolicyFormDialog({ open, onOpenChange }: PolicyFormDialogProps) {
  const createMutation = useCreatePolicy();

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onSubmit = (values: PolicyFormValues) => {
    createMutation.mutate(
      {
        name: values.name.trim(),
        weights: {
          quality: values.quality,
          cost: values.cost,
          speed: values.speed,
        },
        constraints: {},
        enabled: true,
      },
      {
        onSuccess: (created) => {
          toast.success(`Policy "${created.name}" created`);
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(`Failed to create: ${getErrorMessage(err)}`),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Policy</DialogTitle>
          <DialogDescription>
            Define a new routing policy with custom weight parameters
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel required>Policy Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. cost-priority"
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <FormLabel>Quality</FormLabel>
                    <span className="font-mono font-bold text-primary">
                      {field.value}%
                    </span>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(val) => field.onChange(val[0])}
                      max={100}
                      step={5}
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <FormLabel>Cost</FormLabel>
                    <span className="font-mono font-bold text-emerald-500">
                      {field.value}%
                    </span>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(val) => field.onChange(val[0])}
                      max={100}
                      step={5}
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="speed"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <FormLabel>Speed</FormLabel>
                    <span className="font-mono font-bold text-cyan-500">
                      {field.value}%
                    </span>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(val) => field.onChange(val[0])}
                      max={100}
                      step={5}
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
                {createMutation.isPending ? "Creating..." : "Create Policy"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
