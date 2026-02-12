"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { OverdueActionItemsPanel } from "@/components/incidents/OverdueActionItemsPanel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import Link from "next/link";

type StatusFilter = "ALL" | "OPEN" | "MITIGATED" | "CLOSED";
type SeverityFilter = "ALL" | "SEV1" | "SEV2" | "SEV3" | "SEV4";

export default function DashboardPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [severity, setSeverity] = useState<SeverityFilter>("ALL");

  return (
    <AuthGuard>
      <AppShell>
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <Button asChild>
              <Link href="/incidents/new">
                <Plus className="size-4 mr-2" />
                New Incident
              </Link>
            </Button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as StatusFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="MITIGATED">Mitigated</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Severity:</span>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as SeverityFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="SEV1">SEV1</SelectItem>
                  <SelectItem value="SEV2">SEV2</SelectItem>
                  <SelectItem value="SEV3">SEV3</SelectItem>
                  <SelectItem value="SEV4">SEV4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <IncidentTable
            status={status === "ALL" ? undefined : status}
            severity={severity === "ALL" ? undefined : severity}
          />

          <OverdueActionItemsPanel />
        </div>
      </AppShell>
    </AuthGuard>
  );
}
