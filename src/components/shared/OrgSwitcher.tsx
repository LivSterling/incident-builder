"use client";

import { useOrg } from "@/contexts/OrgContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Shield } from "lucide-react";

export function OrgSwitcher() {
  const { activeOrgId, setActiveOrgId, userOrgs, isLoading } = useOrg();

  if (isLoading || userOrgs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2">
      <Building2 className="size-4 text-muted-foreground shrink-0" />
      <Select
        value={activeOrgId ?? ""}
        onValueChange={(v) => setActiveOrgId(v as typeof activeOrgId)}
      >
        <SelectTrigger className="w-[160px] border-0 bg-transparent shadow-none hover:bg-sidebar-accent focus:ring-0">
          <SelectValue placeholder="Select org" />
        </SelectTrigger>
        <SelectContent>
          {userOrgs.map(({ org, isAdminAccess }) => (
            <SelectItem key={org._id} value={org._id}>
              <span className="flex items-center gap-2">
                {org.name}
                {isAdminAccess && (
                  <Shield className="size-3 text-muted-foreground shrink-0" aria-label="Admin access" />
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
