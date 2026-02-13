"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role = "admin" | "editor" | "viewer";

interface AdminRoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: Id<"orgs"> | null;
}

export function AdminRoleManagementDialog({
  open,
  onOpenChange,
  orgId,
}: AdminRoleManagementDialogProps) {
  const users = useQuery(
    api.users.listUsers,
    open && orgId ? { orgId } : "skip"
  );
  const setUserRole = useMutation(api.users.setUserRole);
  const addMember = useMutation(api.orgMembers.addMember);
  const removeMember = useMutation(api.orgMembers.removeMember);
  const allProfiles = useQuery(
    api.users.listAllProfiles,
    open ? {} : "skip"
  );

  const memberProfileIds = new Set(users?.map((u) => u._id) ?? []);

  const handleRoleChange = async (
    profileId: Id<"profiles">,
    newRole: Role
  ) => {
    if (!orgId) return;
    try {
      await setUserRole({ orgId, profileId, role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  const handleAddToOrg = async (profileId: Id<"profiles">) => {
    if (!orgId) return;
    try {
      await addMember({ orgId, profileId });
      toast.success("User added to organization");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add user"
      );
    }
  };

  const handleRemoveFromOrg = async (profileId: Id<"profiles">) => {
    if (!orgId) return;
    try {
      await removeMember({ orgId, profileId });
      toast.success("User removed from organization");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove user"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Users - {orgId ? "Organization" : "Select an org"}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 -mx-6 px-6">
          {!orgId ? (
            <p className="text-sm text-muted-foreground py-4">
              Select an organization from the switcher to manage users.
            </p>
          ) : users === undefined ? (
            <p className="text-sm text-muted-foreground py-4">Loading users...</p>
          ) : (
            <>
              {allProfiles && allProfiles.length > memberProfileIds.size && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm font-medium">Add to org:</span>
                  <Select
                    onValueChange={async (v) => {
                      await handleAddToOrg(v as Id<"profiles">);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select user to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProfiles
                        .filter((p) => !memberProfileIds.has(p._id))
                        .map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name} ({p.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No members in this organization.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <span className="font-medium">{user.name}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(v) =>
                              handleRoleChange(user._id, v as Role)
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemoveFromOrg(user._id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
