"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSelect } from "@/components/shared/UserSelect";

const incidentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  severity: z.enum(["SEV1", "SEV2", "SEV3", "SEV4"]),
  service: z.string().min(1, "Service is required"),
  startTime: z.string().min(1, "Start time is required"),
  impactSummary: z.string().min(1, "Impact summary is required"),
  ownerId: z.string().min(1, "Owner is required"),
});

type IncidentFormValues = z.infer<typeof incidentFormSchema>;

export const INCIDENT_TEMPLATES = [
  {
    name: "Service Outage",
    value: {
      title: "Service Outage",
      severity: "SEV2" as const,
      service: "Core API",
      impactSummary:
        "Users experienced degraded or no access to the service. Impact included delayed response times, failed requests, and inability to complete critical operations.",
    },
  },
  {
    name: "Database Incident",
    value: {
      title: "Database Connectivity Issues",
      severity: "SEV1" as const,
      service: "Database Cluster",
      impactSummary:
        "Database connection pool exhaustion caused cascading failures across dependent services. Multiple applications were unable to read or write data, resulting in full service outage.",
    },
  },
  {
    name: "Deployment Failure",
    value: {
      title: "Bad Deploy",
      severity: "SEV1" as const,
      service: "Production",
      impactSummary:
        "A faulty deployment introduced regressions that caused increased error rates and degraded performance for end users. Rollback was initiated.",
    },
  },
];

interface IncidentFormProps {
  onTemplateSelect?: (template: (typeof INCIDENT_TEMPLATES)[0]["value"]) => void;
}

export function IncidentForm({ onTemplateSelect }: IncidentFormProps) {
  const router = useRouter();
  const createIncident = useMutation(api.incidents.createIncident);

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: "",
      severity: "SEV2",
      service: "",
      startTime: new Date().toISOString().slice(0, 16),
      impactSummary: "",
      ownerId: "",
    },
  });

  const applyTemplate = (template: (typeof INCIDENT_TEMPLATES)[0]["value"]) => {
    form.setValue("title", template.title);
    form.setValue("severity", template.severity);
    form.setValue("service", template.service);
    form.setValue("impactSummary", template.impactSummary);
    onTemplateSelect?.(template);
  };

  const onSubmit = async (values: IncidentFormValues) => {
    try {
      const startTimeMs = new Date(values.startTime).getTime();
      if (isNaN(startTimeMs)) {
        toast.error("Invalid start time");
        return;
      }

      const ownerId = values.ownerId as Id<"profiles">;
      const incidentId = await createIncident({
        title: values.title,
        severity: values.severity,
        service: values.service,
        startTime: startTimeMs,
        impactSummary: values.impactSummary,
        ownerId,
      });

      toast.success("Incident created successfully");
      router.push(`/incidents/${incidentId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create incident"
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium self-center">Template:</span>
          {INCIDENT_TEMPLATES.map((template) => (
            <Button
              key={template.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate(template.value)}
            >
              {template.name}
            </Button>
          ))}
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. VPN Outage" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severity</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SEV1">SEV1</SelectItem>
                  <SelectItem value="SEV2">SEV2</SelectItem>
                  <SelectItem value="SEV3">SEV3</SelectItem>
                  <SelectItem value="SEV4">SEV4</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Core API, VPN" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="impactSummary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Impact Summary</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the impact on users and services..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <FormControl>
                <UserSelect
                  value={field.value ? (field.value as Id<"profiles">) : undefined}
                  onValueChange={field.onChange}
                  placeholder="Select owner"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit">Create Incident</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
