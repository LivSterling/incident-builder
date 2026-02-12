import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./helpers";

/**
 * List incidents with optional status and severity filters.
 * Returns incidents with owner name.
 */
export const listIncidents = query({
  args: {
    status: v.optional(
      v.union(v.literal("OPEN"), v.literal("MITIGATED"), v.literal("CLOSED"))
    ),
    severity: v.optional(
      v.union(
        v.literal("SEV1"),
        v.literal("SEV2"),
        v.literal("SEV3"),
        v.literal("SEV4")
      )
    ),
  },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    let incidents;
    if (args.status) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.severity) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_severity", (q) => q.eq("severity", args.severity!))
        .collect();
    } else {
      incidents = await ctx.db.query("incidents").collect();
    }

    if (args.status && args.severity) {
      incidents = incidents.filter(
        (i) => i.status === args.status && i.severity === args.severity
      );
    } else if (args.severity && !args.status) {
      incidents = incidents.filter((i) => i.severity === args.severity);
    }

    incidents.sort((a, b) => b.startTime - a.startTime);

    const result = await Promise.all(
      incidents.map(async (incident) => {
        const owner = await ctx.db.get(incident.ownerId);
        return {
          ...incident,
          ownerName: owner?.name ?? "Unknown",
        };
      })
    );

    return result;
  },
});

/**
 * Get single incident by ID with owner details.
 */
export const getIncident = query({
  args: { id: v.id("incidents") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const incident = await ctx.db.get(args.id);
    if (!incident) {
      return null;
    }

    const owner = await ctx.db.get(incident.ownerId);
    return {
      ...incident,
      ownerName: owner?.name ?? "Unknown",
    };
  },
});
