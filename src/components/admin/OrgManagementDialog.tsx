"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrgManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrgManagementDialog({
  open,
  onOpenChange,
}: OrgManagementDialogProps) {
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const orgs = useQuery(api.orgs.listOrgs, open ? {} : "skip");
  const createOrg = useMutation(api.orgs.createOrg);

  const handleCreate = async () => {
    const name = newOrgName.trim();
    const slug = newOrgSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || !slug) {
      toast.error("Name and slug are required");
      return;
    }
    try {
      await createOrg({ name, slug });
      toast.success("Organization created");
      setNewOrgName("");
      setNewOrgSlug("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create organization"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Manage Organizations
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 -mx-6 px-6 space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Create Organization</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
              <Input
                placeholder="Slug (e.g. acme-corp)"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
              />
              <Button onClick={handleCreate}>
                <Plus className="size-4 mr-2" />
                Create
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Organizations</h4>
            {orgs === undefined ? (
              <p className="text-sm text-muted-foreground py-4">Loading...</p>
            ) : orgs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No organizations yet. Create one above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org) => (
                    <TableRow key={org._id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {org.slug}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
