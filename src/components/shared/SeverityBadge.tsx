"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

const severityStyles: Record<Severity, string> = {
  SEV1: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  SEV2: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  SEV3: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  SEV4: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", severityStyles[severity])}
    >
      {severity}
    </Badge>
  );
}
