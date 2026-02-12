import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./helpers";

/**
 * List timeline events for an incident, ordered by occurredAt.
 */
export const listTimelineEvents = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    return await ctx.db
      .query("timelineEvents")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", args.incidentId))
      .order("asc")
      .collect();
  },
});
