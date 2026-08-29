"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/molecules/Select";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from "@/components/molecules/Sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/molecules/Form";
import { toast } from "sonner";

const inviteSchema = z.object({
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
  role: z.string().default("admin"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

const defaultValues: InviteFormValues = {
  email: "",
  role: "admin",
};

interface InviteMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberSheet({ open, onOpenChange }: InviteMemberSheetProps) {
  const [isSending, setIsSending] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onSubmit = (values: InviteFormValues) => {
    setIsSending(true);
    setTimeout(() => {
      toast.success(`Invitation sent to ${values.email} with role "${values.role}"`);
      setIsSending(false);
      onOpenChange(false);
    }, 500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Invite Organization Member</SheetTitle>
          <SheetDescription>
            Send an invitation email with specified RBAC role.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Email Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="colleague@company.com"
                      disabled={isSending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Organization Role</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="viewer">Read-Only Viewer</SelectItem>
                      </SelectContent>
                    </Select>
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
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="prismViolet" disabled={isSending}>
                {isSending ? "Sending..." : "Send Invitation"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
