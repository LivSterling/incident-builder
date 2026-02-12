"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserSelect } from "@/components/shared/UserSelect";

interface OverviewTabProps {
  incidentId: Id<"incidents">;
}

export function OverviewTab({ incidentId }: OverviewTabProps) {
  const incident = useQuery(api.incidents.getIncident, { id: incidentId });
  const profile = useQuery(api.users.getCurrentUserProfile);
  const updateIncident = useMutation(api.incidents.updateIncident);
  const setIncidentStatus = useMutation(api.incidents.setIncidentStatus);
  const deleteIncident = useMutation(api.incidents.deleteIncident);

  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState<{
    title: string;
    severity: "SEV1" | "SEV2" | "SEV3" | "SEV4";
    service: string;
    startTime: string;
    endTime: string;
    impactSummary: string;
    rootCause: string;
    ownerId: Id<"profiles"> | "";
  }>({
    title: "",
    severity: "SEV2",
    service: "",
    startTime: "",
    endTime: "",
    impactSummary: "",
    rootCause: "",
    ownerId: "" as Id<"profiles"> | "",
  });

  const canEdit = profile?.role === "admin" || profile?.role === "editor";
  const isAdmin = profile?.role === "admin";

  const startEdit = () => {
    if (!incident) return;
    setEditValues({
      title: incident.title,
      severity: incident.severity,
      service: incident.service,
      startTime: format(incident.startTime, "yyyy-MM-dd'T'HH:mm"),
      endTime: incident.endTime
        ? format(incident.endTime, "yyyy-MM-dd'T'HH:mm")
        : "",
      impactSummary: incident.impactSummary,
      rootCause: incident.rootCause ?? "",
      ownerId: incident.ownerId,
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const saveEdit = async () => {
    try {
      const payload: {
        id: Id<"incidents">;
        title?: string;
        severity?: "SEV1" | "SEV2" | "SEV3" | "SEV4";
        service?: string;
        startTime?: number;
        endTime?: number;
        impactSummary?: string;
        rootCause?: string;
        ownerId?: Id<"profiles">;
      } = {
        id: incidentId,
        title: editValues.title,
        severity: editValues.severity,
        service: editValues.service,
        startTime: new Date(editValues.startTime).getTime(),
        impactSummary: editValues.impactSummary,
        rootCause: editValues.rootCause || undefined,
        ownerId: editValues.ownerId || undefined,
      };
      if (editValues.endTime) {
        payload.endTime = new Date(editValues.endTime).getTime();
      }
      await updateIncident(payload);
      toast.success("Incident updated");
      setEditMode(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update incident"
      );
    }
  };

  const handleSetStatus = async (
    status: "MITIGATED" | "CLOSED"
  ) => {
    try {
      await setIncidentStatus({ id: incidentId, status });
      toast.success(`Incident marked as ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteIncident({ id: incidentId });
      toast.success("Incident deleted");
      setDeleteDialogOpen(false);
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete incident"
      );
    }
  };

  if (!incident) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading incident...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Incident Details</h3>
          </div>
          {canEdit && !editMode && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="size-4 mr-2" />
              Edit
            </Button>
          )}
          {editMode && (
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit}>
                <Check className="size-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X className="size-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editValues.title}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, title: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={editValues.severity}
                  onValueChange={(v) =>
                    setEditValues((prev) => ({
                      ...prev,
                      severity: v as typeof prev.severity,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEV1">SEV1</SelectItem>
                    <SelectItem value="SEV2">SEV2</SelectItem>
                    <SelectItem value="SEV3">SEV3</SelectItem>
                    <SelectItem value="SEV4">SEV4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Service</label>
                <Input
                  value={editValues.service}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, service: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Owner</label>
                <div className="mt-1">
                  <UserSelect
                    value={editValues.ownerId || undefined}
                    onValueChange={(v) =>
                      setEditValues((prev) => ({ ...prev, ownerId: v }))
                    }
                    placeholder="Select owner"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="datetime-local"
                  value={editValues.startTime}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, startTime: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="datetime-local"
                  value={editValues.endTime}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, endTime: e.target.value }))
                  }
                  className="mt-1"
                  placeholder="Optional"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Impact Summary</label>
                <Textarea
                  value={editValues.impactSummary}
                  onChange={(e) =>
                    setEditValues((v) => ({
                      ...v,
                      impactSummary: e.target.value,
                    }))
                  }
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{incident.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Severity</p>
                <SeverityBadge severity={incident.severity} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={incident.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{incident.service}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-medium">{incident.ownerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p className="font-medium">
                  {format(incident.startTime, "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="font-medium">
                  {incident.endTime
                    ? format(incident.endTime, "MMM d, yyyy HH:mm")
                    : "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Impact Summary</p>
                <p className="whitespace-pre-wrap">{incident.impactSummary}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Root Cause */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Root Cause</h3>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <Textarea
              value={editValues.rootCause}
              onChange={(e) =>
                setEditValues((v) => ({ ...v, rootCause: e.target.value }))
              }
              placeholder="Describe the root cause..."
              className="min-h-[120px]"
            />
          ) : (
            <p className="whitespace-pre-wrap">
              {incident.rootCause || (
                <span className="text-muted-foreground">Not yet specified</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status change buttons */}
      {canEdit && !editMode && incident.status !== "CLOSED" && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Status</h3>
            <p className="text-sm text-muted-foreground">
              Update the incident status as you progress.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {incident.status === "OPEN" && (
              <Button
                variant="default"
                onClick={() => handleSetStatus("MITIGATED")}
              >
                Mark Mitigated
              </Button>
            )}
            {(incident.status === "OPEN" || incident.status === "MITIGATED") && (
              <Button
                variant="default"
                onClick={() => handleSetStatus("CLOSED")}
              >
                Mark Closed
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete button - admin only */}
      {isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-4 mr-2" />
              Delete Incident
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Incident</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this incident? This action cannot
              be undone. All timeline events and action items will also be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
