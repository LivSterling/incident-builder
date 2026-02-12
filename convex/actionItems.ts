import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, writeAuditLog, WRITABLE_ROLES } from "./helpers";

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

    const result = await Promise.all(
      items.map(async (item) => {
        const owner = await ctx.db.get(item.ownerId);
        return {
          ...item,
          ownerName: owner?.name ?? "Unknown",
        };
      })
    );
    return result;
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

/**
 * Add an action item to an incident. Requires admin or editor role.
 */
export const addActionItem = mutation({
  args: {
    incidentId: v.id("incidents"),
    title: v.string(),
    ownerId: v.id("profiles"),
    priority: v.union(
      v.literal("P0"),
      v.literal("P1"),
      v.literal("P2")
    ),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }
    const itemId = await ctx.db.insert("actionItems", {
      incidentId: args.incidentId,
      title: args.title,
      ownerId: args.ownerId,
      priority: args.priority,
      dueDate: args.dueDate,
      status: "OPEN",
      createdBy: user._id,
    });
    await writeAuditLog(ctx, {
      actorId: user._id,
      actorName: user.name,
      entityType: "actionItem",
      entityId: itemId,
      action: "create",
      changes: JSON.stringify({ created: args }),
    });
    return itemId;
  },
});

/**
 * Update an action item. Requires admin or editor role.
 */
export const updateActionItem = mutation({
  args: {
    id: v.id("actionItems"),
    title: v.optional(v.string()),
    ownerId: v.optional(v.id("profiles")),
    priority: v.optional(
      v.union(
        v.literal("P0"),
        v.literal("P1"),
        v.literal("P2")
      )
    ),
    dueDate: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("OPEN"),
        v.literal("IN_PROGRESS"),
        v.literal("DONE")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Action item not found");
    }
    const { id, ...updates } = args;
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const oldVal = item[key as keyof typeof item];
        if (JSON.stringify(oldVal) !== JSON.stringify(value)) {
          changes[key] = { old: oldVal, new: value };
        }
      }
    }
    if (Object.keys(changes).length > 0) {
      const isStatusChange = "status" in changes;
      await ctx.db.patch(args.id, updates as Partial<typeof item>);
      await writeAuditLog(ctx, {
        actorId: user._id,
        actorName: user.name,
        entityType: "actionItem",
        entityId: args.id,
        action: isStatusChange ? "statusChange" : "update",
        changes: JSON.stringify(changes),
      });
    }
    return args.id;
  },
});

/**
 * Delete an action item. Requires admin or editor role.
 */
export const deleteActionItem = mutation({
  args: { id: v.id("actionItems") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Action item not found");
    }
    await ctx.db.delete(args.id);
    await writeAuditLog(ctx, {
      actorId: user._id,
      actorName: user.name,
      entityType: "actionItem",
      entityId: args.id,
      action: "delete",
      changes: JSON.stringify({ deleted: item.title }),
    });
    return args.id;
  },
});
