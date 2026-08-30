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
import { useProvidersQuery } from "@/hooks/queries/useProvidersQuery";
import { useCreateCredentialMutation } from "@/hooks/mutations/useCredentialMutations";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/ui";

import { credentialSchema, CredentialFormValues } from "@/features/credentials/schemas/credential.schema";

const defaultValues: CredentialFormValues = {
  providerId: "",
  name: "",
  apiKey: "",
};

interface CredentialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CredentialFormDialog({ open, onOpenChange }: CredentialFormDialogProps) {
  const { data: providersData } = useProvidersQuery();
  const providers = Array.isArray(providersData) ? providersData : [];
  const createMutation = useCreateCredentialMutation();

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onSubmit = (values: CredentialFormValues) => {
    createMutation.mutate(
      { providerId: values.providerId, name: values.name, apiKey: values.apiKey },
      {
        onSuccess: () => {
          toast.success("Credential created successfully");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(`Failed to create credential: ${getErrorMessage(err)}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Provider Credential</DialogTitle>
          <DialogDescription>
            Configure a new API key or secret credential for upstream AI routing.
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
                        <SelectValue placeholder="Select Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.type})
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
                  <FormLabel>Credential Label</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Production Key"
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="sk-..."
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
                {createMutation.isPending ? "Creating..." : "Add Credential"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
