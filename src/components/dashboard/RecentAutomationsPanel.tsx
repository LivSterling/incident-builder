"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Activity, ChevronDown, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecentAutomationsPanelProps {
  orgId: Id<"orgs"> | null;
  isAdmin?: boolean;
}

const JOB_LABELS: Record<string, string> = {
  escalateStaleIncidents: "SLA Escalation",
  notifyDueActionItems: "Action Reminders",
  sendWeeklyDigest: "Weekly Digest",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUCCESS: "default",
  RUNNING: "secondary",
  ERROR: "destructive",
};

export function RecentAutomationsPanel({ orgId, isAdmin }: RecentAutomationsPanelProps) {
  const runs = useQuery(
    api.automations.index.listAutomationRuns,
    orgId ? { orgId, limit: 5 } : "skip"
  );
  const runEscalation = useMutation(api.automations.index.runEscalationNow);
  const runReminders = useMutation(api.automations.index.runRemindersNow);
  const runDigest = useMutation(api.automations.index.runDigestNow);

  if (!orgId) {
    return null;
  }

  const handleRun = async (job: "escalation" | "reminders" | "digest") => {
    try {
      if (job === "escalation") await runEscalation({ orgId });
      if (job === "reminders") await runReminders({ orgId });
      if (job === "digest") await runDigest({ orgId });
    } catch {
      // Error visible in Convex
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Recent Automations
            </CardTitle>
            <CardDescription>
              Last 5 automation runs for this organization
            </CardDescription>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Play className="size-4 mr-2" />
                  Run Now
                  <ChevronDown className="size-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRun("escalation")}>
                  SLA Escalation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRun("reminders")}>
                  Action Reminders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRun("digest")}>
                  Weekly Digest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {runs === undefined ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No automation runs yet.
            {isAdmin && " Use &quot;Run Now&quot; to trigger a job for demo."}
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Affected</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run._id}>
                    <TableCell className="font-medium">
                      {JOB_LABELS[run.jobName] ?? run.jobName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[run.status] ?? "outline"}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {run.counts.affected} ({run.counts.notificationsCreated} notified)
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(run.startedAt, { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
