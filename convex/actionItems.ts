import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./helpers";

/**
 * List action items for an incident, ordered by priority (P0, P1, P2).
 */
export const listActionItems = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const items = await ctx.db
      .query("actionItems")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", args.incidentId))
      .collect();

    const priorityOrder = { P0: 0, P1: 1, P2: 2 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    return items;
  },
});

/**
 * List all overdue action items (dueDate < now, status != DONE).
 * Sorted by most overdue first.
 */
export const listOverdueActionItems = query({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);

    const now = Date.now();
    const allItems = await ctx.db.query("actionItems").collect();

    const overdue = allItems.filter(
      (item) => item.dueDate < now && item.status !== "DONE"
    );

    overdue.sort((a, b) => a.dueDate - b.dueDate);

    const result = await Promise.all(
      overdue.map(async (item) => {
        const incident = await ctx.db.get(item.incidentId);
        const owner = await ctx.db.get(item.ownerId);
        return {
          ...item,
          incidentTitle: incident?.title ?? "Unknown",
          ownerName: owner?.name ?? "Unknown",
        };
      })
    );

    return result;
  },
});
