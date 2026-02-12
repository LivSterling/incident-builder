import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, writeAuditLog, WRITABLE_ROLES } from "./helpers";

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

const incidentValidator = {
  title: v.string(),
  severity: v.union(
    v.literal("SEV1"),
    v.literal("SEV2"),
    v.literal("SEV3"),
    v.literal("SEV4")
  ),
  service: v.string(),
  startTime: v.number(),
  endTime: v.optional(v.number()),
  impactSummary: v.string(),
  rootCause: v.optional(v.string()),
  ownerId: v.id("profiles"),
};

/**
 * Create a new incident. Requires admin or editor role.
 */
export const createIncident = mutation({
  args: incidentValidator,
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES, { createIfMissing: true });
    const incidentId = await ctx.db.insert("incidents", {
      title: args.title,
      severity: args.severity,
      status: "OPEN",
      service: args.service,
      startTime: args.startTime,
      endTime: args.endTime,
      impactSummary: args.impactSummary,
      rootCause: args.rootCause,
      ownerId: args.ownerId,
      createdBy: user._id,
    });
    await writeAuditLog(ctx, {
      actorId: user._id,
      actorName: user.name,
      entityType: "incident",
      entityId: incidentId,
      action: "create",
      changes: JSON.stringify({ created: args }),
    });
    return incidentId;
  },
});

/**
 * Update an existing incident. Requires admin or editor role.
 */
export const updateIncident = mutation({
  args: {
    id: v.id("incidents"),
    title: v.optional(v.string()),
    severity: v.optional(
      v.union(
        v.literal("SEV1"),
        v.literal("SEV2"),
        v.literal("SEV3"),
        v.literal("SEV4")
      )
    ),
    service: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    impactSummary: v.optional(v.string()),
    rootCause: v.optional(v.string()),
    ownerId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const incident = await ctx.db.get(args.id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    const { id, ...updates } = args;
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const oldVal = incident[key as keyof typeof incident];
        if (JSON.stringify(oldVal) !== JSON.stringify(value)) {
          changes[key] = { old: oldVal, new: value };
        }
      }
    }
    if (Object.keys(changes).length > 0) {
      await ctx.db.patch(args.id, updates as Partial<typeof incident>);
      await writeAuditLog(ctx, {
        actorId: user._id,
        actorName: user.name,
        entityType: "incident",
        entityId: args.id,
        action: "update",
        changes: JSON.stringify(changes),
      });
    }
    return args.id;
  },
});

/**
 * Set incident status (OPEN/MITIGATED/CLOSED).
 * CLOSED requires rootCause and at least 1 action item.
 */
export const setIncidentStatus = mutation({
  args: {
    id: v.id("incidents"),
    status: v.union(
      v.literal("OPEN"),
      v.literal("MITIGATED"),
      v.literal("CLOSED")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, WRITABLE_ROLES);
    const incident = await ctx.db.get(args.id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    if (args.status === "CLOSED") {
      if (!incident.rootCause?.trim()) {
        throw new Error("Root cause required to close incident");
      }
      const items = await ctx.db
        .query("actionItems")
        .withIndex("by_incidentId", (q) => q.eq("incidentId", args.id))
        .collect();
      if (items.length === 0) {
        throw new Error("At least 1 action item required to close incident");
      }
    }
    const oldStatus = incident.status;
    await ctx.db.patch(args.id, { status: args.status });
    await writeAuditLog(ctx, {
      actorId: user._id,
      actorName: user.name,
      entityType: "incident",
      entityId: args.id,
      action: "statusChange",
      changes: JSON.stringify({ status: { old: oldStatus, new: args.status } }),
    });
    return args.id;
  },
});

/**
 * Delete an incident. Admin only.
 */
export const deleteIncident = mutation({
  args: { id: v.id("incidents") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const incident = await ctx.db.get(args.id);
    if (!incident) {
      throw new Error("Incident not found");
    }
    const user = await getCurrentUser(ctx);
    const timelineEvents = await ctx.db
      .query("timelineEvents")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", args.id))
      .collect();
    const actionItems = await ctx.db
      .query("actionItems")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", args.id))
      .collect();
    for (const ev of timelineEvents) {
      await ctx.db.delete(ev._id);
    }
    for (const item of actionItems) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.id);
    await writeAuditLog(ctx, {
      actorId: user._id,
      actorName: user.name,
      entityType: "incident",
      entityId: args.id,
      action: "delete",
      changes: JSON.stringify({ deleted: incident.title }),
    });
    return args.id;
  },
});
