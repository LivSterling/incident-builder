"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface WeeklyDigestsPanelProps {
  orgId: Id<"orgs"> | null;
}

export function WeeklyDigestsPanel({ orgId }: WeeklyDigestsPanelProps) {
  const digests = useQuery(
    api.digests.listDigests,
    orgId ? { orgId, limit: 5 } : "skip"
  );

  if (!orgId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          Weekly Digests
        </CardTitle>
        <CardDescription>
          Recent weekly summary reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {digests === undefined ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : digests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No digests yet. Run the Weekly Digest automation to generate one.
          </p>
        ) : (
          <ul className="space-y-2">
            {digests.map((d) => (
              <li key={d._id}>
                <Link
                  href={`/digests/${d._id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="font-medium">
                    Week of {d.weekStartDate}
                  </span>
                  <span className="text-muted-foreground">
                    ({format(d.createdAt, "MMM d, yyyy")})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
