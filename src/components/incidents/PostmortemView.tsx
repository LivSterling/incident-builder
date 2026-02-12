"use client";

import { format, formatDistanceStrict } from "date-fns";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { ActionItemStatusBadge } from "@/components/shared/ActionItemStatusBadge";
import type { Doc } from "../../../convex/_generated/dataModel";

type IncidentWithOwner = Doc<"incidents"> & { ownerName: string };
type TimelineEvent = Doc<"timelineEvents">;
type ActionItemWithOwner = Doc<"actionItems"> & { ownerName: string };

interface PostmortemViewProps {
  incident: IncidentWithOwner;
  timelineEvents: TimelineEvent[];
  actionItems: ActionItemWithOwner[];
  showCopyButton?: boolean;
  onCopyShareLink?: () => void;
}

export function PostmortemView({
  incident,
  timelineEvents,
  actionItems,
  showCopyButton = false,
  onCopyShareLink,
}: PostmortemViewProps) {
  const duration =
    incident.endTime && incident.startTime
      ? formatDistanceStrict(incident.endTime, incident.startTime)
      : null;

  return (
    <div className="space-y-8 print:space-y-6">
      {(showCopyButton && onCopyShareLink) ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Postmortem Document</h2>
          <Button variant="outline" onClick={onCopyShareLink}>
            <Copy className="size-4 mr-2" />
            Copy Share Link
          </Button>
        </div>
      ) : (
        <h2 className="text-xl font-semibold">Postmortem Document</h2>
      )}

      {/* Incident Summary */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Incident Summary</h3>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="font-medium text-lg">{incident.title}</p>
          <div className="flex flex-wrap gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Service:</span>{" "}
              {incident.service}
            </p>
            <p>
              <span className="text-muted-foreground">Owner:</span>{" "}
              {incident.ownerName}
            </p>
            <p>
              <span className="text-muted-foreground">Start Time:</span>{" "}
              {format(incident.startTime, "MMM d, yyyy HH:mm")}
            </p>
            <p>
              <span className="text-muted-foreground">End Time:</span>{" "}
              {incident.endTime
                ? format(incident.endTime, "MMM d, yyyy HH:mm")
                : "—"}
            </p>
            {duration && (
              <p>
                <span className="text-muted-foreground">Duration:</span>{" "}
                {duration}
              </p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Impact</p>
            <p className="whitespace-pre-wrap mt-1">{incident.impactSummary}</p>
          </div>
        </div>
      </section>

      {/* Timeline of Events */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Timeline of Events</h3>
        {timelineEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">No timeline events.</p>
        ) : (
          <ol className="list-decimal list-inside space-y-2 rounded-lg border bg-card p-4">
            {timelineEvents.map((event) => (
              <li key={event._id} className="text-sm">
                <span className="font-medium">
                  {format(event.occurredAt, "MMM d, yyyy HH:mm")} — {event.actor}
                </span>
                : {event.message}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Root Cause Analysis */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Root Cause Analysis</h3>
        <div className="rounded-lg border bg-card p-4">
          <p className="whitespace-pre-wrap">
            {incident.rootCause || (
              <span className="text-muted-foreground">Not yet specified</span>
            )}
          </p>
        </div>
      </section>

      {/* Action Items */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Action Items</h3>
        {actionItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No action items.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionItems.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.ownerName}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={item.priority} />
                    </TableCell>
                    <TableCell>
                      {format(item.dueDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <ActionItemStatusBadge
                        status={
                          item.status as "OPEN" | "IN_PROGRESS" | "DONE"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
