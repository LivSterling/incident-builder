"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { ActionItemStatusBadge } from "@/components/shared/ActionItemStatusBadge";
import { UserSelect } from "@/components/shared/UserSelect";

interface ActionItemsTabProps {
  incidentId: Id<"incidents">;
}

type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE";
type ActionItemPriority = "P0" | "P1" | "P2";

const STATUS_ORDER: ActionItemStatus[] = ["OPEN", "IN_PROGRESS", "DONE"];

export function ActionItemsTab({ incidentId }: ActionItemsTabProps) {
  const items = useQuery(api.actionItems.listActionItems, { incidentId });
  const profile = useQuery(api.users.getCurrentUserProfile);
  const addItem = useMutation(api.actionItems.addActionItem);
  const updateItem = useMutation(api.actionItems.updateActionItem);
  const deleteItem = useMutation(api.actionItems.deleteActionItem);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"actionItems"> | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    ownerId: "" as Id<"profiles"> | "",
    priority: "P1" as ActionItemPriority,
    dueDate: "",
  });
  const [addForm, setAddForm] = useState({
    title: "",
    ownerId: "" as Id<"profiles"> | "",
    priority: "P1" as ActionItemPriority,
    dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const handleAdd = async () => {
    try {
      await addItem({
        incidentId,
        title: addForm.title.trim(),
        ownerId: addForm.ownerId as Id<"profiles">,
        priority: addForm.priority,
        dueDate: new Date(addForm.dueDate).getTime(),
      });
      toast.success("Action item added");
      setAddDialogOpen(false);
      setAddForm({
        title: "",
        ownerId: "" as Id<"profiles">,
        priority: "P1",
        dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add action item"
      );
    }
  };

  const startEdit = (item: {
    _id: Id<"actionItems">;
    title: string;
    ownerId: Id<"profiles">;
    priority: ActionItemPriority;
    dueDate: number;
  }) => {
    setEditingId(item._id);
    setEditForm({
      title: item.title,
      ownerId: item.ownerId,
      priority: item.priority,
      dueDate: format(item.dueDate, "yyyy-MM-dd"),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateItem({
        id: editingId,
        title: editForm.title.trim(),
        ownerId: editForm.ownerId || undefined,
        priority: editForm.priority,
        dueDate: new Date(editForm.dueDate).getTime(),
      });
      toast.success("Action item updated");
      setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update action item"
      );
    }
  };

  const handleDelete = async (id: Id<"actionItems">) => {
    try {
      await deleteItem({ id });
      toast.success("Action item deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete action item"
      );
    }
  };

  const cycleStatus = async (item: {
    _id: Id<"actionItems">;
    status: ActionItemStatus;
  }) => {
    const idx = STATUS_ORDER.indexOf(item.status);
    const nextStatus = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    try {
      await updateItem({ id: item._id, status: nextStatus });
      toast.success(`Status updated to ${nextStatus.replace("_", " ")}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  };

  if (items === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Loading action items...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Action Item
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No action items yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isOverdue =
                  item.dueDate < Date.now() && item.status !== "DONE";
                const daysOverdue = isOverdue
                  ? differenceInDays(Date.now(), item.dueDate)
                  : 0;

                return (
                  <TableRow
                    key={item._id}
                    className={isOverdue ? "bg-destructive/5" : undefined}
                  >
                    <TableCell>
                      {editingId === item._id ? (
                        <Input
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm((v) => ({ ...v, title: e.target.value }))
                          }
                          className="h-8"
                        />
                      ) : (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item._id ? (
                        <UserSelect
                          value={editForm.ownerId || undefined}
                          onValueChange={(v) =>
                            setEditForm((prev) => ({ ...prev, ownerId: v }))
                          }
                          placeholder="Owner"
                        />
                      ) : (
                        item.ownerName
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item._id ? (
                        <Select
                          value={editForm.priority}
                          onValueChange={(v) =>
                            setEditForm((prev) => ({
                              ...prev,
                              priority: v as ActionItemPriority,
                            }))
                          }
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="P0">P0</SelectItem>
                            <SelectItem value="P1">P1</SelectItem>
                            <SelectItem value="P2">P2</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <PriorityBadge priority={item.priority} />
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item._id ? (
                        <Input
                          type="date"
                          value={editForm.dueDate}
                          onChange={(e) =>
                            setEditForm((v) => ({
                              ...v,
                              dueDate: e.target.value,
                            }))
                          }
                          className="h-8 w-40"
                        />
                      ) : (
                        <span
                          className={
                            isOverdue
                              ? "text-destructive font-medium flex items-center gap-2"
                              : ""
                          }
                        >
                          {format(item.dueDate, "MMM d, yyyy")}
                          {isOverdue && (
                            <span className="text-sm">
                              ({daysOverdue} day
                              {daysOverdue !== 1 ? "s" : ""} overdue)
                            </span>
                          )}
                          {isOverdue && (
                            <AlertCircle className="size-4 inline" />
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item._id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <ActionItemStatusBadge
                            status={
                              item.status as "OPEN" | "IN_PROGRESS" | "DONE"
                            }
                          />
                          {canEdit && item.status !== "DONE" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2"
                              onClick={() => cycleStatus(item)}
                            >
                              Next
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        {editingId === item._id ? null : (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item._id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g. Update runbook"
                value={addForm.title}
                onChange={(e) =>
                  setAddForm((v) => ({ ...v, title: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <div className="mt-1">
                <UserSelect
                  value={addForm.ownerId || undefined}
                  onValueChange={(v) =>
                    setAddForm((prev) => ({ ...prev, ownerId: v }))
                  }
                  placeholder="Select owner"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={addForm.priority}
                onValueChange={(v) =>
                  setAddForm((prev) => ({
                    ...prev,
                    priority: v as ActionItemPriority,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0</SelectItem>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={addForm.dueDate}
                onChange={(e) =>
                  setAddForm((v) => ({ ...v, dueDate: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Action Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
