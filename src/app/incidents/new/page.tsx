"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { IncidentForm } from "@/components/incidents/IncidentForm";
import { useOrg } from "@/contexts/OrgContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function NewIncidentContent() {
  const { activeOrgId, userOrgs } = useOrg();

  if (userOrgs.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              You are not in any organization. Contact your admin to get access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading organization...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New Incident</CardTitle>
          <CardDescription>
            Create a new incident postmortem. Use a template to pre-fill common fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncidentForm orgId={activeOrgId} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewIncidentPage() {
  return (
    <AuthGuard>
      <AppShell>
        <NewIncidentContent />
      </AppShell>
    </AuthGuard>
  );
}
