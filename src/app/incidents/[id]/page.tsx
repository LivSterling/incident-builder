"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/incidents/OverviewTab";
import { TimelineTab } from "@/components/incidents/TimelineTab";
import { ActionItemsTab } from "@/components/incidents/ActionItemsTab";
import { PostmortemTab } from "@/components/incidents/PostmortemTab";
import { AuditLogTab } from "@/components/incidents/AuditLogTab";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as Id<"incidents">;
  const incident = useQuery(api.incidents.getIncident, { id });

  return (
    <AuthGuard>
      <AppShell>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold truncate">
                {incident?.title ?? "Loading..."}
              </h1>
              <p className="text-sm text-muted-foreground">
                {incident
                  ? `Incident ID: ${id}`
                  : "Loading incident details..."}
              </p>
            </div>
          </div>

          {incident && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto lg:inline-grid">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="action-items">Action Items</TabsTrigger>
                <TabsTrigger value="postmortem">Postmortem</TabsTrigger>
                <TabsTrigger value="audit">Audit Log</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <OverviewTab incidentId={id} orgId={incident.orgId} />
              </TabsContent>
              <TabsContent value="timeline">
                <TimelineTab incidentId={id} />
              </TabsContent>
              <TabsContent value="action-items">
                <ActionItemsTab incidentId={id} orgId={incident.orgId} />
              </TabsContent>
              <TabsContent value="postmortem">
                <PostmortemTab incidentId={id} />
              </TabsContent>
              <TabsContent value="audit">
                <AuditLogTab incidentId={id} orgId={incident.orgId} />
              </TabsContent>
            </Tabs>
          )}

          {incident === null && (
            <div className="rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">Incident not found.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
