"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE";

const statusStyles: Record<ActionItemStatus, string> = {
  OPEN: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  IN_PROGRESS: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  DONE: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
};

export function ActionItemStatusBadge({ status }: { status: ActionItemStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", statusStyles[status])}
    >
      {status.replace("_", " ")}
    </Badge>
  );
}
