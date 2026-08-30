"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/molecules/Card";
import { Button } from "@/components/atoms/Button";
import { Slider } from "@/components/atoms/Slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/molecules/Select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/molecules/Form";
import type { ApiRoutingPolicy } from "@/lib/api";
import { Save, SlidersHorizontal } from "lucide-react";

const tunerSchema = z.object({
  quality: z.number().default(40),
  cost: z.number().default(30),
  speed: z.number().default(20),
});

type TunerFormValues = z.infer<typeof tunerSchema>;

interface PolicyTunerProps {
  policies: ApiRoutingPolicy[];
  selectedPolicyId: string;
  selectedPolicy?: ApiRoutingPolicy;
  onSelectedPolicyChange: (id: string) => void;
  saving: boolean;
  onSave: (weights: { quality: number; cost: number; speed: number }) => void;
}

const defaultValues: TunerFormValues = {
  quality: 40,
  cost: 30,
  speed: 20,
};

export function PolicyTuner({
  policies,
  selectedPolicyId,
  selectedPolicy,
  onSelectedPolicyChange,
  saving,
  onSave,
}: PolicyTunerProps) {
  const form = useForm<TunerFormValues>({
    resolver: zodResolver(tunerSchema),
    defaultValues,
  });

  const { reset } = form;

  useEffect(() => {
    if (!selectedPolicy) {
      reset(defaultValues);
      return;
    }
    reset({
      quality: selectedPolicy.weights?.quality ?? 40,
      cost: selectedPolicy.weights?.cost ?? 30,
      speed: selectedPolicy.weights?.speed ?? 20,
    });
  }, [selectedPolicy, reset]);

  const onSubmit = (values: TunerFormValues) => {
    onSave({
      quality: values.quality,
      cost: values.cost,
      speed: values.speed,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <span>Tune Policy Weights</span>
        </CardTitle>
        <CardDescription>
          Select a policy and adjust its routing weight sliders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <FormLabel className="text-xs font-semibold">Select Policy</FormLabel>
          <Select value={selectedPolicyId} onValueChange={onSelectedPolicyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a policy" />
            </SelectTrigger>
            <SelectContent>
              {policies.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? " (Default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Quality Factor
                    </span>
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
                      disabled={saving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Cost Optimization
                    </span>
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
                      disabled={saving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="speed"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Speed & Latency
                    </span>
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
                      disabled={saving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              variant="prismViolet"
              className="w-full gap-2 mt-4"
              disabled={!selectedPolicyId || saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Policy Parameters"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
