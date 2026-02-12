import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./helpers";

/**
 * List audit logs for an entity (incident, timeline event, or action item).
 * Also loads audit logs for child timeline events and action items when entityType is incident.
 * Ordered by timestamp descending (newest first).
 */
export const listAuditLogs = query({
  args: {
    entityType: v.union(
      v.literal("incident"),
      v.literal("timeline"),
      v.literal("actionItem")
    ),
    entityId: v.union(
      v.id("incidents"),
      v.id("timelineEvents"),
      v.id("actionItems")
    ),
  },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const directLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_entityType_entityId", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    if (args.entityType !== "incident") {
      return directLogs;
    }

    const incidentId = args.entityId as Id<"incidents">;
    const timelineEvents = await ctx.db
      .query("timelineEvents")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", incidentId))
      .collect();
    const actionItems = await ctx.db
      .query("actionItems")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", incidentId))
      .collect();

    const childLogs = [];

    for (const ev of timelineEvents) {
      const logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_entityType_entityId", (q) =>
          q.eq("entityType", "timeline").eq("entityId", ev._id)
        )
        .collect();
      childLogs.push(...logs);
    }
    for (const item of actionItems) {
      const logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_entityType_entityId", (q) =>
          q.eq("entityType", "actionItem").eq("entityId", item._id)
        )
        .collect();
      childLogs.push(...logs);
    }

    const allLogs = [...directLogs, ...childLogs];
    return allLogs.sort((a, b) => b.timestamp - a.timestamp);
  },
});
