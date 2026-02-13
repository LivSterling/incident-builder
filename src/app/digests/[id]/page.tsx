"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SeverityBadge } from "@/components/shared/SeverityBadge";

export default function DigestDetailPage() {
  const params = useParams();
  const digestId = params.id as string;

  const digest = useQuery(
    api.digests.getDigest,
    digestId ? { digestId: digestId as any } : "skip"
  );

  return (
    <AuthGuard>
      <AppShell>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
                <span className="sr-only">Back to dashboard</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Weekly Digest</h1>
              <p className="text-muted-foreground text-sm">
                Week of {digest?.weekStartDate ?? "—"}
              </p>
            </div>
          </div>

          {digest === undefined ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : digest === null ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Digest not found or you do not have access.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Open Incidents by Severity</CardTitle>
                  <CardDescription>
                    Count of open incidents for the week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 flex-wrap">
                    <div className="rounded-lg border px-4 py-3 min-w-[120px]">
                      <span className="text-2xl font-bold text-destructive">
                        {digest.summary.openBySeverity.SEV1}
                      </span>
                      <p className="text-sm text-muted-foreground">SEV1</p>
                    </div>
                    <div className="rounded-lg border px-4 py-3 min-w-[120px]">
                      <span className="text-2xl font-bold text-orange-500">
                        {digest.summary.openBySeverity.SEV2}
                      </span>
                      <p className="text-sm text-muted-foreground">SEV2</p>
                    </div>
                    <div className="rounded-lg border px-4 py-3 min-w-[120px]">
                      <span className="text-2xl font-bold text-amber-500">
                        {digest.summary.openBySeverity.SEV3}
                      </span>
                      <p className="text-sm text-muted-foreground">SEV3</p>
                    </div>
                    <div className="rounded-lg border px-4 py-3 min-w-[120px]">
                      <span className="text-2xl font-bold">
                        {digest.summary.openBySeverity.SEV4}
                      </span>
                      <p className="text-sm text-muted-foreground">SEV4</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overdue Action Items</CardTitle>
                  <CardDescription>
                    Total count: {digest.summary.overdueActionsCount}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Oldest Open Incidents</CardTitle>
                  <CardDescription>
                    Incidents needing attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {digest.summary.topIncidents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No open incidents
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Days Open</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {digest.summary.topIncidents.map((inc) => (
                          <TableRow key={inc.id}>
                            <TableCell className="font-medium">
                              {inc.title}
                            </TableCell>
                            <TableCell>
                              <SeverityBadge severity={inc.severity as any} />
                            </TableCell>
                            <TableCell>{inc.daysOpen} days</TableCell>
                            <TableCell>
                              <Button variant="link" size="sm" asChild>
                                <Link href={`/incidents/${inc.id}`}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Most Overdue Action Items</CardTitle>
                  <CardDescription>
                    Action items past their due date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {digest.summary.topActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No overdue action items
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Incident</TableHead>
                          <TableHead>Days Overdue</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {digest.summary.topActions.map((action) => (
                          <TableRow key={action.id}>
                            <TableCell className="font-medium">
                              {action.title}
                            </TableCell>
                            <TableCell>{action.incidentTitle}</TableCell>
                            <TableCell className="text-destructive font-medium">
                              {action.daysOverdue} days
                            </TableCell>
                            <TableCell>
                              <Button variant="link" size="sm" asChild>
                                <Link href={`/incidents/${action.incidentId}`}>View</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
