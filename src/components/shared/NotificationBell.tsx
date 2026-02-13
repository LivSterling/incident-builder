"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Bell, AlertTriangle, CalendarClock, FileText, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NotificationIcon({
  type,
  className,
}: {
  type: Doc<"notifications">["type"];
  className?: string;
}) {
  switch (type) {
    case "INCIDENT_ESCALATION":
      return <AlertTriangle className={cn("size-4 text-destructive", className)} />;
    case "ACTION_DUE_SOON":
      return <CalendarClock className={cn("size-4 text-amber-500", className)} />;
    case "ACTION_OVERDUE":
      return <AlertTriangle className={cn("size-4 text-destructive", className)} />;
    case "WEEKLY_DIGEST":
      return <FileText className={cn("size-4 text-primary", className)} />;
    default:
      return <Mail className={cn("size-4", className)} />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const notifications = useQuery(api.notifications.listNotifications, {
    limit: 10,
  });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleNotificationClick = async (n: Doc<"notifications">) => {
    if (n.readAt === undefined) {
      await markRead({ notificationId: n._id });
    }
    router.push(n.link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="font-semibold">Notifications</span>
          {notifications && notifications.length > 0 && unreadCount !== undefined && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                markAllRead();
              }}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications === undefined ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="space-y-0">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={cn(
                    "flex cursor-pointer gap-3 px-3 py-2.5 hover:bg-accent",
                    n.readAt === undefined && "bg-accent/50"
                  )}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(n);
                    }
                  }}
                >
                  <NotificationIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  {n.readAt === undefined && (
                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
