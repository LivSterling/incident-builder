"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "OPEN" | "MITIGATED" | "CLOSED";

const statusStyles: Record<Status, string> = {
  OPEN: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  MITIGATED: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  CLOSED: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", statusStyles[status])}
    >
      {status}
    </Badge>
  );
}
