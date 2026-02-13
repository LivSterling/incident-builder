"use client";

import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { Building2, LayoutDashboard, Menu, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminRoleManagementDialog } from "@/components/admin/AdminRoleManagementDialog";
import { OrgManagementDialog } from "@/components/admin/OrgManagementDialog";
import { OrgProvider, useOrg } from "@/contexts/OrgContext";
import { OrgSwitcher } from "@/components/shared/OrgSwitcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents/new", label: "New Incident", icon: Plus },
];

/**
 * Inner AppShell that uses OrgContext. Must be wrapped by OrgProvider.
 */
function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const { activeOrgId, userOrgs } = useOrg();
  const syncProfile = useMutation(api.users.syncProfile);
  const profile = useQuery(
    api.users.getCurrentUserProfile,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (isAuthenticated) {
      syncProfile();
    }
  }, [isAuthenticated, syncProfile]);

  const NavContent = () => (
    <>
      {userOrgs.length > 0 && (
        <div className="border-b border-sidebar-border px-2 py-3">
          <OrgSwitcher />
        </div>
      )}
      <div className="flex flex-col gap-2 px-2 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </div>
      {profile?.role === "admin" && (
        <>
          <Separator />
          <div className="px-2 py-4 space-y-1">
            <button
              type="button"
              onClick={() => {
                setOrgDialogOpen(true);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Building2 className="size-4" />
              Manage Orgs
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminDialogOpen(true);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Users className="size-4" />
              Manage Users
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="font-semibold text-sidebar-foreground">
            Incident Builder
          </Link>
        </div>
        <NavContent />
        <div className="mt-auto border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "size-8",
                },
              }}
            />
            <div className="flex flex-1 flex-col min-w-0">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.name ?? "Loading..."}
              </span>
              <Badge variant="secondary" className="w-fit text-xs capitalize">
                {profile?.role ?? "—"}
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area: mobile header + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="border-b p-4 text-left">
                <SheetTitle>Incident Builder</SheetTitle>
              </SheetHeader>
              <NavContent />
              <div className="mt-auto border-t p-4">
                <div className="flex items-center gap-3">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "size-8",
                      },
                    }}
                  />
                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="truncate text-sm font-medium">
                      {profile?.name ?? "Loading..."}
                    </span>
                    <Badge variant="secondary" className="w-fit text-xs capitalize">
                      {profile?.role ?? "—"}
                    </Badge>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="font-semibold">
            Incident Builder
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      <AdminRoleManagementDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        orgId={activeOrgId}
      />
      <OrgManagementDialog
        open={orgDialogOpen}
        onOpenChange={setOrgDialogOpen}
      />
    </div>
  );
}

/**
 * Enterprise sidebar layout with navigation, user info, and responsive design.
 * - Org switcher for multi-tenant support
 * - Nav links: Dashboard, New Incident
 * - User section at bottom with UserButton + role badge
 * - Admin section: Manage Users link (admin only)
 * - Responsive: collapsible on mobile via Sheet
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <AppShellContent>{children}</AppShellContent>
    </OrgProvider>
  );
}
