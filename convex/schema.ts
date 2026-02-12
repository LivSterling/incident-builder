import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  incidents: defineTable({
    title: v.string(),
    severity: v.union(
      v.literal("SEV1"),
      v.literal("SEV2"),
      v.literal("SEV3"),
      v.literal("SEV4")
    ),
    status: v.union(
      v.literal("OPEN"),
      v.literal("MITIGATED"),
      v.literal("CLOSED")
    ),
    service: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    impactSummary: v.string(),
    rootCause: v.optional(v.string()),
    ownerId: v.id("profiles"),
    createdBy: v.id("profiles"),
  })
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_ownerId", ["ownerId"]),

  timelineEvents: defineTable({
    incidentId: v.id("incidents"),
    occurredAt: v.number(),
    message: v.string(),
    actor: v.string(),
    createdBy: v.id("profiles"),
  }).index("by_incidentId", ["incidentId"]),

  actionItems: defineTable({
    incidentId: v.id("incidents"),
    title: v.string(),
    ownerId: v.id("profiles"),
    priority: v.union(
      v.literal("P0"),
      v.literal("P1"),
      v.literal("P2")
    ),
    dueDate: v.number(),
    status: v.union(
      v.literal("OPEN"),
      v.literal("IN_PROGRESS"),
      v.literal("DONE")
    ),
    createdBy: v.id("profiles"),
  })
    .index("by_incidentId", ["incidentId"])
    .index("by_status_dueDate", ["status", "dueDate"]),

  auditLogs: defineTable({
    actorId: v.id("profiles"),
    actorName: v.string(),
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
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("statusChange")
    ),
    changes: v.string(),
    timestamp: v.number(),
  })
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),
});
