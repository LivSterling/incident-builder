"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { IncidentForm } from "@/components/incidents/IncidentForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewIncidentPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="p-4 sm:p-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>New Incident</CardTitle>
              <CardDescription>
                Create a new incident postmortem. Use a template to pre-fill common fields.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IncidentForm />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
