"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditLogTabProps {
  incidentId: Id<"incidents">;
}

function EntityLabel({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const typeMap: Record<string, string> = {
    incident: "Incident",
    timeline: "Timeline Event",
    actionItem: "Action Item",
  };
  return (
    <span>
      {typeMap[entityType] ?? entityType} ({entityId.slice(-8)})
    </span>
  );
}

export function AuditLogTab({ incidentId }: AuditLogTabProps) {
  const logs = useQuery(api.auditLogs.listAuditLogs, {
    entityType: "incident",
    entityId: incidentId,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Loading audit logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No audit logs for this incident.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Audit trail for this incident and its timeline events and action items.
      </p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const rowId = `${log.entityType}-${log.entityId}`;
              const isExpanded = expandedId === rowId;
              let parsedChanges: unknown = null;
              try {
                parsedChanges = JSON.parse(log.changes);
              } catch {
                parsedChanges = log.changes;
              }

              return (
                <React.Fragment key={log._id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : rowId)
                    }
                  >
                    <TableCell className="text-muted-foreground">
                      {format(log.timestamp, "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>{log.actorName}</TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {log.action.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <EntityLabel
                        entityType={log.entityType}
                        entityId={log.entityId}
                      />
                    </TableCell>
                    <TableCell>
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="bg-muted/30 p-4 font-mono text-xs overflow-x-auto"
                      >
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(parsedChanges, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
