"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
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
import { PriorityBadge } from "@/components/shared/PriorityBadge";

export function OverdueActionItemsPanel() {
  const overdueItems = useQuery(api.actionItems.listOverdueActionItems);

  if (overdueItems === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5" />
            Overdue Action Items
          </CardTitle>
          <CardDescription>Action items past their due date</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="size-5" />
          Overdue Action Items
          {overdueItems.length > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-sm font-medium text-destructive">
              {overdueItems.length}
            </span>
          )}
        </CardTitle>
        <CardDescription>Action items past their due date</CardDescription>
      </CardHeader>
      <CardContent>
        {overdueItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No overdue action items. Great job!
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Incident</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueItems.map((item) => {
                  const daysOverdue = differenceInDays(
                    Date.now(),
                    item.dueDate
                  );
                  return (
                    <TableRow
                      key={item._id}
                      className="bg-destructive/5"
                    >
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Link
                          href={`/incidents/${item.incidentId}`}
                          className="text-primary hover:underline"
                        >
                          {item.incidentTitle}
                        </Link>
                      </TableCell>
                      <TableCell>{item.ownerName}</TableCell>
                      <TableCell className="text-destructive font-medium">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="size-4 shrink-0" />
                          {format(item.dueDate, "MMM d, yyyy")}
                          <span className="text-sm">
                            ({daysOverdue} day{daysOverdue !== 1 ? "s" : ""}{" "}
                            overdue)
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={item.priority} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
