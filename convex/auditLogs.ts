import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, requireOrgAccess } from "./helpers";

/**
 * List audit logs for an entity (incident, timeline event, or action item).
 * Also loads audit logs for child timeline events and action items when entityType is incident.
 * Ordered by timestamp descending (newest first). Scoped to organization.
 */
export const listAuditLogs = query({
  args: {
    orgId: v.id("orgs"),
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
    const profile = await getCurrentUser(ctx);
    await requireOrgAccess(ctx, profile._id, args.orgId);

    const directLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_entityType_entityId", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    const orgScopedLogs = directLogs.filter((log) => log.orgId === args.orgId);

    if (args.entityType !== "incident") {
      return orgScopedLogs;
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
      childLogs.push(...logs.filter((log) => log.orgId === args.orgId));
    }
    for (const item of actionItems) {
      const logs = await ctx.db
        .query("auditLogs")
        .withIndex("by_entityType_entityId", (q) =>
          q.eq("entityType", "actionItem").eq("entityId", item._id)
        )
        .collect();
      childLogs.push(...logs.filter((log) => log.orgId === args.orgId));
    }

    const allLogs = [...orgScopedLogs, ...childLogs];
    return allLogs.sort((a, b) => b.timestamp - a.timestamp);
  },
});
