"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";

export default function NewIncidentPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">New Incident</h1>
          <p className="mt-2 text-muted-foreground">
            Create incident form will be implemented in Phase 5.
          </p>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
