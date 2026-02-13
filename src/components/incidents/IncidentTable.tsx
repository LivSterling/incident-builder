"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
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

type StatusFilter = "OPEN" | "MITIGATED" | "CLOSED";
type SeverityFilter = "SEV1" | "SEV2" | "SEV3" | "SEV4";

interface IncidentTableProps {
  orgId: import("../../../convex/_generated/dataModel").Id<"orgs"> | null;
  status?: StatusFilter;
  severity?: SeverityFilter;
}

export function IncidentTable({ orgId, status, severity }: IncidentTableProps) {
  const router = useRouter();
  const incidents = useQuery(
    api.incidents.listIncidents,
    orgId ? { orgId, status, severity } : "skip"
  );

  if (!orgId) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Select an organization to view incidents.
      </div>
    );
  }

  if (incidents === undefined) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Start Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Start Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No incidents found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Start Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => (
            <TableRow
              key={incident._id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/incidents/${incident._id}`)}
            >
              <TableCell className="font-medium">{incident.title}</TableCell>
              <TableCell>
                <SeverityBadge severity={incident.severity} />
              </TableCell>
              <TableCell>
                <StatusBadge status={incident.status} />
              </TableCell>
              <TableCell>{incident.service}</TableCell>
              <TableCell>{incident.ownerName}</TableCell>
              <TableCell>
                {format(incident.startTime, "MMM d, yyyy HH:mm")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
