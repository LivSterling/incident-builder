"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TimelineTabProps {
  incidentId: Id<"incidents">;
}

export function TimelineTab({ incidentId }: TimelineTabProps) {
  const events = useQuery(api.timeline.listTimelineEvents, {
    incidentId,
  });
  const profile = useQuery(api.users.getCurrentUserProfile);
  const addEvent = useMutation(api.timeline.addTimelineEvent);
  const updateEvent = useMutation(api.timeline.updateTimelineEvent);
  const deleteEvent = useMutation(api.timeline.deleteTimelineEvent);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"timelineEvents"> | null>(null);
  const [editForm, setEditForm] = useState({
    occurredAt: "",
    message: "",
    actor: "",
  });
  const [addForm, setAddForm] = useState({
    occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    message: "",
    actor: "",
  });

  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const handleAdd = async () => {
    try {
      await addEvent({
        incidentId,
        occurredAt: new Date(addForm.occurredAt).getTime(),
        message: addForm.message.trim(),
        actor: addForm.actor.trim(),
      });
      toast.success("Event added");
      setAddDialogOpen(false);
      setAddForm({
        occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        message: "",
        actor: "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add event"
      );
    }
  };

  const startEdit = (event: {
    _id: Id<"timelineEvents">;
    occurredAt: number;
    message: string;
    actor: string;
  }) => {
    setEditingId(event._id);
    setEditForm({
      occurredAt: format(event.occurredAt, "yyyy-MM-dd'T'HH:mm"),
      message: event.message,
      actor: event.actor,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateEvent({
        id: editingId,
        occurredAt: new Date(editForm.occurredAt).getTime(),
        message: editForm.message.trim(),
        actor: editForm.actor.trim(),
      });
      toast.success("Event updated");
      setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      );
    }
  };

  const handleDelete = async (id: Id<"timelineEvents">) => {
    try {
      await deleteEvent({ id });
      toast.success("Event deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event"
      );
    }
  };

  if (events === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Loading timeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Event
          </Button>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-6 pl-10">
          {events.length === 0 ? (
            <p className="text-muted-foreground py-8">No timeline events yet.</p>
          ) : (
            events.map((event) => (
              <div key={event._id} className="relative">
                <div className="absolute -left-6 top-4 size-3 rounded-full bg-primary" />
                <div className="rounded-lg border bg-card p-4">
                  {editingId === event._id ? (
                    <div className="space-y-3">
                      <Input
                        type="datetime-local"
                        value={editForm.occurredAt}
                        onChange={(e) =>
                          setEditForm((v) => ({
                            ...v,
                            occurredAt: e.target.value,
                          }))
                        }
                      />
                      <Input
                        placeholder="Actor"
                        value={editForm.actor}
                        onChange={(e) =>
                          setEditForm((v) => ({ ...v, actor: e.target.value }))
                        }
                      />
                      <Textarea
                        placeholder="Message"
                        value={editForm.message}
                        onChange={(e) =>
                          setEditForm((v) => ({
                            ...v,
                            message: e.target.value,
                          }))
                        }
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Check className="size-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-muted-foreground">
                            {format(event.occurredAt, "MMM d, yyyy HH:mm")} •
                            {event.actor}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">
                            {event.message}
                          </p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(event)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(event._id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timeline Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Occurred At</label>
              <Input
                type="datetime-local"
                value={addForm.occurredAt}
                onChange={(e) =>
                  setAddForm((v) => ({ ...v, occurredAt: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Actor</label>
              <Input
                placeholder="e.g. John Doe"
                value={addForm.actor}
                onChange={(e) =>
                  setAddForm((v) => ({ ...v, actor: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Describe what happened..."
                value={addForm.message}
                onChange={(e) =>
                  setAddForm((v) => ({ ...v, message: e.target.value }))
                }
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
