"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
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
}

export function AdminRoleManagementDialog({
  open,
  onOpenChange,
}: AdminRoleManagementDialogProps) {
  const users = useQuery(api.users.listUsers, open ? {} : "skip");
  const setUserRole = useMutation(api.users.setUserRole);

  const handleRoleChange = async (
    profileId: Id<"profiles">,
    newRole: Role
  ) => {
    try {
      await setUserRole({ profileId, role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 -mx-6 px-6">
          {users === undefined ? (
            <p className="text-sm text-muted-foreground py-4">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No users found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
