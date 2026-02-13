import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  orgs: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  orgMembers: defineTable({
    orgId: v.id("orgs"),
    profileId: v.id("profiles"),
    joinedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_profileId", ["profileId"])
    .index("by_orgId_profileId", ["orgId", "profileId"]),

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
    orgId: v.optional(v.id("orgs")),
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
    .index("by_orgId", ["orgId"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_ownerId", ["ownerId"])
    .index("by_orgId_status", ["orgId", "status"]),

  timelineEvents: defineTable({
    orgId: v.optional(v.id("orgs")),
    incidentId: v.id("incidents"),
    occurredAt: v.number(),
    message: v.string(),
    actor: v.string(),
    createdBy: v.id("profiles"),
  })
    .index("by_incidentId", ["incidentId"])
    .index("by_orgId", ["orgId"]),

  actionItems: defineTable({
    orgId: v.optional(v.id("orgs")),
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
    actionItemType: v.optional(v.string()), // "confirm_monitoring" | "update_runbook" | "schedule_retro" | undefined for manual
  })
    .index("by_incidentId", ["incidentId"])
    .index("by_orgId", ["orgId"])
    .index("by_status_dueDate", ["status", "dueDate"])
    .index("by_incidentId_type", ["incidentId", "actionItemType"])
    .index("by_orgId_status_dueDate", ["orgId", "status", "dueDate"]),

  auditLogs: defineTable({
    orgId: v.optional(v.id("orgs")),
    actorId: v.id("profiles"),
    actorName: v.string(),
    entityType: v.union(
      v.literal("incident"),
      v.literal("timeline"),
      v.literal("actionItem"),
      v.literal("profile")
    ),
    entityId: v.union(
      v.id("incidents"),
      v.id("timelineEvents"),
      v.id("actionItems"),
      v.id("profiles")
    ),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("statusChange"),
      v.literal("autoCreate")
    ),
    changes: v.string(),
    timestamp: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_orgId_timestamp", ["orgId", "timestamp"]),
});
