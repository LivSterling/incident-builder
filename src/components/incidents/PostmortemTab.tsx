"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PostmortemView } from "./PostmortemView";

interface PostmortemTabProps {
  incidentId: Id<"incidents">;
}

export function PostmortemTab({ incidentId }: PostmortemTabProps) {
  const incident = useQuery(api.incidents.getIncident, { id: incidentId });
  const timelineEvents = useQuery(api.timeline.listTimelineEvents, {
    incidentId,
  });
  const actionItems = useQuery(api.actionItems.listActionItems, {
    incidentId,
  });

  const copyShareLink = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${incidentId}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  };

  if (!incident) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading postmortem...</p>
      </div>
    );
  }

  return (
    <PostmortemView
      incident={incident}
      timelineEvents={timelineEvents ?? []}
      actionItems={actionItems ?? []}
      showCopyButton
      onCopyShareLink={copyShareLink}
    />
  );
}
