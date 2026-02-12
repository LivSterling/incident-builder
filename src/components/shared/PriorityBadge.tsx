"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Priority = "P0" | "P1" | "P2";

const priorityStyles: Record<Priority, string> = {
  P0: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  P1: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  P2: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", priorityStyles[priority])}
    >
      {priority}
    </Badge>
  );
}
