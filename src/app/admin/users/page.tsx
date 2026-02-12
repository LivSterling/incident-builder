"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";

export default function AdminUsersPage() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Manage Users</h1>
          <p className="mt-2 text-muted-foreground">
            User role management will be implemented in Phase 8.
          </p>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
