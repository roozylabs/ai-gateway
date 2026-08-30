"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/molecules/Select";
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
import { useCreateModel } from "@/hooks/queries/useModelsQuery";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

import { modelSchema, ModelFormValues } from "@/features/models/schemas/create-model.schema";

const defaultValues: ModelFormValues = {
  providerId: "",
  name: "",
  slug: "",
  displayName: "",
  inputPricePer1M: undefined,
  outputPricePer1M: undefined,
  qualityScore: undefined,
  speedScore: undefined,
};

interface ProviderOption {
  id: string;
  name: string;
}

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerOptions: ProviderOption[];
}

export function ModelFormDialog({
  open,
  onOpenChange,
  providerOptions,
}: ModelFormDialogProps) {
  const createMutation = useCreateModel();

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onSubmit = (values: ModelFormValues) => {
    createMutation.mutate(
      {
        providerId: values.providerId,
        data: {
          name: values.name.trim(),
          slug: values.slug.trim(),
          displayName: values.displayName.trim() || values.name.trim(),
          inputPricePer1M: values.inputPricePer1M,
          outputPricePer1M: values.outputPricePer1M,
          qualityScore: values.qualityScore,
          speedScore: values.speedScore,
        },
      },
      {
        onSuccess: () => {
          toast.success("Model created successfully");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(`Failed to create model: ${getErrorMessage(err)}`),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Model</DialogTitle>
          <DialogDescription>
            Register a new LLM model under an existing provider.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={createMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Model Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., GPT-4o"
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., gpt-4o"
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Display Name (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., GPT-4o"
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
                name="inputPricePer1M"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Input Price / 1M</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="0.00"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outputPricePer1M"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Output Price / 1M</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="0.00"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="qualityScore"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Quality Score</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="0-100"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="speedScore"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Speed Score</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="0-100"
                        disabled={createMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                {createMutation.isPending ? "Creating..." : "Create Model"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
