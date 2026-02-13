import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./helpers";

/**
 * List notifications for the current user, newest first.
 */
export const listNotifications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx);

    const limit = args.limit ?? 20;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", profile._id))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

/**
 * Get count of unread notifications for the current user.
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentUser(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", profile._id))
      .collect();

    return notifications.filter((n) => n.readAt === undefined).length;
  },
});

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (notification.userId !== profile._id) {
      throw new Error("Not authorized to modify this notification");
    }

    if (notification.readAt === undefined) {
      await ctx.db.patch(args.notificationId, {
        readAt: Date.now(),
      });
    }

    return args.notificationId;
  },
});

/**
 * Mark all notifications for the current user as read.
 */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentUser(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", profile._id))
      .collect();

    const now = Date.now();
    for (const n of notifications) {
      if (n.readAt === undefined) {
        await ctx.db.patch(n._id, { readAt: now });
      }
    }

    return notifications.length;
  },
});
