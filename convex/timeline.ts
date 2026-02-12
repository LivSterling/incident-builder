import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, writeAuditLog, WRITABLE_ROLES } from "./helpers";

/**
 * List timeline events for an incident, ordered by occurredAt.
 */
export const listTimelineEvents = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const events = await ctx.db
      .query("timelineEvents")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", args.incidentId))
      .collect();
    return events.sort((a, b) => a.occurredAt - b.occurredAt);
  },
});

/**
 * Add a timeline event to an incident. Requires admin or editor role.
 */
export const addTimelineEvent = mutation({
  args: {
    incidentId: v.id("incidents"),
    occurredAt: v.number(),
    message: v.string(),
    actor: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }
    const eventId = await ctx.db.insert("timelineEvents", {
      incidentId: args.incidentId,
      occurredAt: args.occurredAt,
      message: args.message,
      actor: args.actor,
      createdBy: user._id,
    });
    await writeAuditLog(ctx, {
      actorId: user._id,
      actorName: user.name,
      entityType: "timeline",
      entityId: eventId,
      action: "create",
      changes: JSON.stringify({ created: args }),
    });
    return eventId;
  },
});

/**
 * Update a timeline event. Requires admin or editor role.
 */
export const updateTimelineEvent = mutation({
  args: {
    id: v.id("timelineEvents"),
    occurredAt: v.optional(v.number()),
    message: v.optional(v.string()),
    actor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const event = await ctx.db.get(args.id);
    if (!event) {
      throw new Error("Timeline event not found");
    }
    const { id, ...updates } = args;
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const oldVal = event[key as keyof typeof event];
        if (JSON.stringify(oldVal) !== JSON.stringify(value)) {
          changes[key] = { old: oldVal, new: value };
        }
      }
    }
    if (Object.keys(changes).length > 0) {
      await ctx.db.patch(args.id, updates as Partial<typeof event>);
      await writeAuditLog(ctx, {
        actorId: user._id,
        actorName: user.name,
        entityType: "timeline",
        entityId: args.id,
        action: "update",
        changes: JSON.stringify(changes),
      });
    }
    return args.id;
  },
});

/**
 * Delete a timeline event. Requires admin or editor role.
 */
export const deleteTimelineEvent = mutation({
  args: { id: v.id("timelineEvents") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const event = await ctx.db.get(args.id);
    if (!event) {
      throw new Error("Timeline event not found");
    }
    await ctx.db.delete(args.id);
    await writeAuditLog(ctx, {
      actorId: user._id,
      actorName: user.name,
      entityType: "timeline",
      entityId: args.id,
      action: "delete",
      changes: JSON.stringify({ deleted: event.message }),
    });
    return args.id;
  },
});
