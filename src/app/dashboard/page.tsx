"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome to Incident Postmortem Builder. Use the sidebar to navigate.
          </p>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
