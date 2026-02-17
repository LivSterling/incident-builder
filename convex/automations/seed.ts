import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  getCurrentUser,
  requireOrgAccess,
  writeAuditLog,
} from "../helpers";

async function getFirstOrgMember(ctx: { db: any }, orgId: Id<"orgs">): Promise<Id<"profiles">> {
  const member = await ctx.db
    .query("orgMembers")
    .withIndex("by_orgId", (q: any) => q.eq("orgId", orgId))
    .first();
  if (!member) throw new Error("Org has no members. Add yourself to the org first.");
  return member.profileId;
}

/**
 * Helper to add a profile as a member to an org (for seeding purposes)
 */
export const addOrgMemberInternal = internalMutation({
  args: { orgId: v.id("orgs"), profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    // Check if already a member
    const existing = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_profileId", (q: any) =>
        q.eq("orgId", args.orgId).eq("profileId", args.profileId)
      )
      .first();
    if (existing) return { alreadyMember: true, memberId: existing._id };

    const memberId = await ctx.db.insert("orgMembers", {
      orgId: args.orgId,
      profileId: args.profileId,
      joinedAt: Date.now(),
    });
    return { alreadyMember: false, memberId };
  },
});

/**
 * Seed demo data for automation testing (internal, for CLI use).
 * Creates:
 * - 1 OPEN incident (SEV2) older than 2h SLA threshold -> will trigger escalation
 * - 1 overdue action item
 * - 1 action item due within 3 days
 *
 * Call via: npx convex run automations/seed:seedAutomationDemoDataInternal --args '{"orgId":"<orgId>"}'
 */
export const seedAutomationDemoDataInternal = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const ownerId = await getFirstOrgMember(ctx, args.orgId);
    const owner = await ctx.db.get(ownerId);
    if (!owner) throw new Error("Owner profile not found");

    return seedAutomationData(ctx, args.orgId, ownerId, owner.name);
  },
});

/**
 * Seed demo data for automation testing (public, requires auth).
 * Call from dashboard or: npx convex run automations/seed:seedAutomationDemoData --args '{"orgId":"<orgId>"}'
 */
export const seedAutomationDemoData = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { createIfMissing: true });
    await requireOrgAccess(ctx, user._id, args.orgId);

    return seedAutomationData(ctx, args.orgId, user._id, user.name);
  },
});

async function seedAutomationData(
  ctx: any,
  orgId: Id<"orgs">,
  ownerId: Id<"profiles">,
  ownerName: string
) {

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const threeHoursAgo = now - 3 * 60 * 60 * 1000;
    const yesterday = now - oneDay;
    const tomorrow = now + oneDay;

    const incidentId = await ctx.db.insert("incidents", {
      orgId,
      title: "SLA Test Incident - Auto-Escalation Demo",
      severity: "SEV2",
      status: "OPEN",
      service: "Demo Service",
      startTime: threeHoursAgo,
      impactSummary:
        "Demo incident for testing SLA escalation. Exceeds 2h SEV2 threshold.",
      ownerId,
      createdBy: ownerId,
    });

    await writeAuditLog(ctx, {
      orgId,
      actorId: ownerId,
      actorName: ownerName,
      entityType: "incident",
      entityId: incidentId,
      action: "create",
      changes: JSON.stringify({
        created: "SLA Test Incident",
        purpose: "automation_demo",
      }),
    });

    const overdueActionId = await ctx.db.insert("actionItems", {
      orgId,
      incidentId,
      title: "Overdue action item - Reminder Demo",
      ownerId,
      priority: "P1",
      dueDate: yesterday,
      status: "OPEN",
      createdBy: ownerId,
    });

    await writeAuditLog(ctx, {
      orgId,
      actorId: ownerId,
      actorName: ownerName,
      entityType: "actionItem",
      entityId: overdueActionId,
      action: "create",
      changes: JSON.stringify({
        created: "Overdue action - automation demo",
      }),
    });

    const dueSoonActionId = await ctx.db.insert("actionItems", {
      orgId,
      incidentId,
      title: "Due soon action item - Reminder Demo",
      ownerId,
      priority: "P2",
      dueDate: tomorrow,
      status: "OPEN",
      createdBy: ownerId,
    });

    await writeAuditLog(ctx, {
      orgId,
      actorId: ownerId,
      actorName: ownerName,
      entityType: "actionItem",
      entityId: dueSoonActionId,
      action: "create",
      changes: JSON.stringify({
        created: "Due soon action - automation demo",
      }),
    });

    return {
      incidentId,
      overdueActionId,
      dueSoonActionId,
      message:
        "Demo data created. Run escalation and reminder automations to see notifications.",
    };
}

// ============================================================================
// COMPREHENSIVE SEED DATA - 10 Diverse Incidents
// ============================================================================

const INCIDENT_SEED_DATA = [
  {
    title: "Database Connection Pool Exhaustion",
    severity: "SEV1" as const,
    status: "CLOSED" as const,
    service: "PostgreSQL Primary",
    daysAgo: 14,
    durationHours: 2.5,
    impactSummary: "Complete outage of all database-dependent services affecting 100% of users. All API requests returning 500 errors.",
    rootCause: "Connection leak in payment processing service caused by unclosed connections in error handling path.",
    escalationLevel: 2,
    timeline: [
      { offsetMinutes: 0, message: "Alerts triggered for database connection pool at 95% capacity", actor: "PagerDuty" },
      { offsetMinutes: 5, message: "On-call engineer acknowledged and began investigation", actor: "On-Call Engineer" },
      { offsetMinutes: 15, message: "Identified connection leak pattern in payment service logs", actor: "On-Call Engineer" },
      { offsetMinutes: 25, message: "Escalated to SEV1, all hands called", actor: "Incident Commander" },
      { offsetMinutes: 45, message: "Temporary fix deployed: increased pool size and restarted affected pods", actor: "Platform Team" },
      { offsetMinutes: 90, message: "Root cause identified in payment-service error handler", actor: "Payment Team" },
      { offsetMinutes: 120, message: "Permanent fix deployed and verified", actor: "Payment Team" },
      { offsetMinutes: 150, message: "Incident closed, monitoring confirmed stable", actor: "Incident Commander" },
    ],
    actionItems: [
      { title: "Add connection pool monitoring dashboard", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 3 },
      { title: "Implement connection leak detection in CI pipeline", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 7 },
      { title: "Update runbook for database connection issues", priority: "P2" as const, status: "DONE" as const, dueDaysFromStart: 5 },
    ],
  },
  {
    title: "Authentication Service Degradation",
    severity: "SEV2" as const,
    status: "CLOSED" as const,
    service: "Auth Service",
    daysAgo: 10,
    durationHours: 1.5,
    impactSummary: "50% of login attempts failing due to Redis cache inconsistency. Mobile apps most affected.",
    rootCause: "Redis cluster failover caused session cache to become stale. Automatic invalidation not working as expected.",
    escalationLevel: 1,
    timeline: [
      { offsetMinutes: 0, message: "Spike in failed login attempts detected", actor: "Datadog" },
      { offsetMinutes: 3, message: "Customer support reports influx of login complaints", actor: "Support Team" },
      { offsetMinutes: 10, message: "Auth service team paged and investigating", actor: "PagerDuty" },
      { offsetMinutes: 20, message: "Redis cluster failover identified as trigger", actor: "Auth Team" },
      { offsetMinutes: 35, message: "Cache flush initiated to clear stale sessions", actor: "Auth Team" },
      { offsetMinutes: 60, message: "Login success rate returning to normal", actor: "Auth Team" },
      { offsetMinutes: 90, message: "Incident resolved, post-mortem scheduled", actor: "Incident Commander" },
    ],
    actionItems: [
      { title: "Implement Redis cluster health check in auth flow", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 5 },
      { title: "Add automatic cache invalidation on failover", priority: "P0" as const, status: "DONE" as const, dueDaysFromStart: 2 },
      { title: "Create mobile-specific login fallback mechanism", priority: "P2" as const, status: "IN_PROGRESS" as const, dueDaysFromStart: 14 },
    ],
  },
  {
    title: "CDN Cache Poisoning",
    severity: "SEV1" as const,
    status: "CLOSED" as const,
    service: "CloudFront CDN",
    daysAgo: 21,
    durationHours: 4,
    impactSummary: "Incorrect content being served to users in EU region. Static assets showing outdated versions causing UI breakage.",
    rootCause: "Misconfigured cache key in deployment pipeline caused old assets to be served with new HTML.",
    escalationLevel: 3,
    timeline: [
      { offsetMinutes: 0, message: "Reports of broken UI from EU users", actor: "Support Team" },
      { offsetMinutes: 15, message: "Frontend team confirms asset version mismatch", actor: "Frontend Team" },
      { offsetMinutes: 30, message: "CDN cache invalidation initiated", actor: "DevOps" },
      { offsetMinutes: 45, message: "Invalidation taking longer than expected, escalating", actor: "DevOps" },
      { offsetMinutes: 90, message: "AWS support engaged for emergency cache purge", actor: "Incident Commander" },
      { offsetMinutes: 150, message: "Full cache purge completed", actor: "AWS Support" },
      { offsetMinutes: 180, message: "EU traffic verified serving correct assets", actor: "Frontend Team" },
      { offsetMinutes: 240, message: "Incident closed after global verification", actor: "Incident Commander" },
    ],
    actionItems: [
      { title: "Audit and fix CDN cache key configuration", priority: "P0" as const, status: "DONE" as const, dueDaysFromStart: 1 },
      { title: "Implement asset versioning in deployment pipeline", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 7 },
      { title: "Add CDN cache monitoring to observability stack", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 10 },
      { title: "Create CDN incident runbook", priority: "P2" as const, status: "DONE" as const, dueDaysFromStart: 14 },
    ],
  },
  {
    title: "Payment Gateway Timeout Spike",
    severity: "SEV2" as const,
    status: "MITIGATED" as const,
    service: "Stripe Integration",
    daysAgo: 3,
    durationHours: null,
    impactSummary: "15% of payment transactions timing out. Revenue impact estimated at $50k/hour during peak.",
    rootCause: "Stripe API experiencing elevated latency. Circuit breaker not triggering properly.", // Ongoing
    escalationLevel: 1,
    timeline: [
      { offsetMinutes: 0, message: "Payment timeout alerts firing", actor: "PagerDuty" },
      { offsetMinutes: 5, message: "Confirmed Stripe status page showing degraded performance", actor: "Payment Team" },
      { offsetMinutes: 15, message: "Increased timeout thresholds as temporary mitigation", actor: "Payment Team" },
      { offsetMinutes: 30, message: "Customer communication sent about potential delays", actor: "Support Team" },
      { offsetMinutes: 60, message: "Stripe reports partial recovery", actor: "Stripe Status" },
    ],
    actionItems: [
      { title: "Review and adjust circuit breaker thresholds", priority: "P1" as const, status: "OPEN" as const, dueDaysFromStart: 5 },
      { title: "Implement payment retry queue for failed transactions", priority: "P0" as const, status: "IN_PROGRESS" as const, dueDaysFromStart: 3 },
      { title: "Add backup payment provider integration", priority: "P2" as const, status: "OPEN" as const, dueDaysFromStart: 30 },
    ],
  },
  {
    title: "Kubernetes Node Memory Pressure",
    severity: "SEV3" as const,
    status: "CLOSED" as const,
    service: "K8s Production Cluster",
    daysAgo: 7,
    durationHours: 0.75,
    impactSummary: "Several pods evicted due to memory pressure on 2 nodes. Minor service disruption during pod rescheduling.",
    rootCause: "Memory leak in logging sidecar container accumulated over 2 weeks.",
    escalationLevel: 0,
    timeline: [
      { offsetMinutes: 0, message: "Node memory pressure alerts triggered", actor: "Prometheus" },
      { offsetMinutes: 5, message: "Pod evictions detected on nodes k8s-prod-07 and k8s-prod-12", actor: "K8s Events" },
      { offsetMinutes: 10, message: "Identified logging sidecar as memory culprit", actor: "Platform Team" },
      { offsetMinutes: 20, message: "Rolling restart of affected deployments initiated", actor: "Platform Team" },
      { offsetMinutes: 35, message: "All pods healthy, memory usage normalized", actor: "Platform Team" },
      { offsetMinutes: 45, message: "Incident closed", actor: "Platform Team" },
    ],
    actionItems: [
      { title: "Update logging sidecar to patched version", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 1 },
      { title: "Add memory limit alerts for sidecar containers", priority: "P2" as const, status: "DONE" as const, dueDaysFromStart: 3 },
    ],
  },
  {
    title: "Search Index Corruption",
    severity: "SEV2" as const,
    status: "OPEN" as const,
    service: "Elasticsearch",
    daysAgo: 1,
    durationHours: null,
    impactSummary: "Product search returning incomplete results. Approximately 20% of catalog not appearing in searches.",
    rootCause: undefined,
    escalationLevel: 1,
    timeline: [
      { offsetMinutes: 0, message: "Customer reports missing products in search", actor: "Support Team" },
      { offsetMinutes: 30, message: "Confirmed index inconsistency in products cluster", actor: "Search Team" },
      { offsetMinutes: 60, message: "Reindexing job started for affected shards", actor: "Search Team" },
      { offsetMinutes: 120, message: "Reindex at 40%, ETA 3 more hours", actor: "Search Team" },
    ],
    actionItems: [
      { title: "Complete product catalog reindexing", priority: "P0" as const, status: "IN_PROGRESS" as const, dueDaysFromStart: 1 },
      { title: "Investigate root cause of index corruption", priority: "P1" as const, status: "OPEN" as const, dueDaysFromStart: 3 },
      { title: "Implement index health monitoring", priority: "P1" as const, status: "OPEN" as const, dueDaysFromStart: 7 },
    ],
  },
  {
    title: "SSL Certificate Expiration",
    severity: "SEV1" as const,
    status: "CLOSED" as const,
    service: "api.example.com",
    daysAgo: 30,
    durationHours: 0.5,
    impactSummary: "API endpoint unreachable for all clients due to expired SSL certificate. Complete API outage.",
    rootCause: "Certificate renewal automation failed silently 30 days ago. No alerting on renewal failures.",
    escalationLevel: 2,
    timeline: [
      { offsetMinutes: 0, message: "Mass alerts: API endpoint returning SSL errors", actor: "Multiple Systems" },
      { offsetMinutes: 2, message: "Confirmed certificate expired at midnight", actor: "On-Call Engineer" },
      { offsetMinutes: 5, message: "Emergency certificate renewal initiated", actor: "Security Team" },
      { offsetMinutes: 15, message: "New certificate deployed to load balancers", actor: "DevOps" },
      { offsetMinutes: 20, message: "API traffic recovering", actor: "DevOps" },
      { offsetMinutes: 30, message: "Full recovery confirmed, incident closed", actor: "Incident Commander" },
    ],
    actionItems: [
      { title: "Fix certificate auto-renewal pipeline", priority: "P0" as const, status: "DONE" as const, dueDaysFromStart: 1 },
      { title: "Add certificate expiration monitoring (30/14/7 day alerts)", priority: "P0" as const, status: "DONE" as const, dueDaysFromStart: 2 },
      { title: "Audit all certificates across infrastructure", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 7 },
      { title: "Document certificate management procedures", priority: "P2" as const, status: "DONE" as const, dueDaysFromStart: 14 },
    ],
  },
  {
    title: "Third-Party API Rate Limiting",
    severity: "SEV3" as const,
    status: "CLOSED" as const,
    service: "Twilio SMS",
    daysAgo: 5,
    durationHours: 2,
    impactSummary: "SMS notifications delayed by up to 30 minutes due to hitting Twilio rate limits during marketing campaign.",
    rootCause: "Uncoordinated marketing email campaign triggered mass SMS opt-in flow exceeding rate limits.",
    escalationLevel: 0,
    timeline: [
      { offsetMinutes: 0, message: "SMS delivery latency alerts triggered", actor: "Datadog" },
      { offsetMinutes: 10, message: "Twilio dashboard showing rate limit errors", actor: "Notifications Team" },
      { offsetMinutes: 20, message: "Marketing campaign identified as traffic source", actor: "Notifications Team" },
      { offsetMinutes: 30, message: "Implemented request throttling in SMS service", actor: "Notifications Team" },
      { offsetMinutes: 90, message: "Backlog cleared, delivery times normalizing", actor: "Notifications Team" },
      { offsetMinutes: 120, message: "Incident closed, coordinating with marketing team", actor: "Notifications Team" },
    ],
    actionItems: [
      { title: "Implement SMS rate limiting in application layer", priority: "P1" as const, status: "DONE" as const, dueDaysFromStart: 3 },
      { title: "Create campaign coordination checklist with engineering", priority: "P2" as const, status: "DONE" as const, dueDaysFromStart: 7 },
    ],
  },
  {
    title: "Data Pipeline Backlog",
    severity: "SEV4" as const,
    status: "CLOSED" as const,
    service: "Apache Kafka",
    daysAgo: 12,
    durationHours: 6,
    impactSummary: "Analytics data delayed by 4 hours. No customer-facing impact but internal dashboards showing stale data.",
    rootCause: "Kafka consumer group rebalancing storm caused by frequent pod restarts during deployment.",
    escalationLevel: 0,
    timeline: [
      { offsetMinutes: 0, message: "Consumer lag alerts for analytics topics", actor: "Prometheus" },
      { offsetMinutes: 30, message: "Identified rebalancing as cause of lag", actor: "Data Team" },
      { offsetMinutes: 60, message: "Paused deployments to stabilize consumer groups", actor: "Data Team" },
      { offsetMinutes: 180, message: "Consumer lag decreasing, backlog processing", actor: "Data Team" },
      { offsetMinutes: 360, message: "Lag cleared, dashboards current", actor: "Data Team" },
    ],
    actionItems: [
      { title: "Implement static consumer group membership", priority: "P2" as const, status: "DONE" as const, dueDaysFromStart: 7 },
      { title: "Add deployment coordination for Kafka consumers", priority: "P2" as const, status: "DONE" as const, dueDaysFromStart: 10 },
    ],
  },
  {
    title: "DNS Propagation Failure",
    severity: "SEV2" as const,
    status: "OPEN" as const,
    service: "Route53 DNS",
    daysAgo: 0,
    durationHours: null,
    impactSummary: "New subdomain not resolving for ~30% of users. Geo-distributed users experiencing intermittent access issues.",
    rootCause: undefined,
    escalationLevel: 1,
    timeline: [
      { offsetMinutes: 0, message: "Reports of DNS resolution failures for new subdomain", actor: "Support Team" },
      { offsetMinutes: 15, message: "Confirmed DNS propagation incomplete across regions", actor: "DevOps" },
      { offsetMinutes: 30, message: "TTL misconfiguration identified, correcting records", actor: "DevOps" },
      { offsetMinutes: 45, message: "Waiting for DNS propagation, monitoring ongoing", actor: "DevOps" },
    ],
    actionItems: [
      { title: "Monitor DNS propagation completion", priority: "P0" as const, status: "IN_PROGRESS" as const, dueDaysFromStart: 1 },
      { title: "Review DNS TTL standards for new records", priority: "P1" as const, status: "OPEN" as const, dueDaysFromStart: 3 },
      { title: "Add DNS health checks to deployment pipeline", priority: "P2" as const, status: "OPEN" as const, dueDaysFromStart: 7 },
    ],
  },
];

/**
 * Seed comprehensive incidents with varied dates, timelines, and action items.
 * Call via: npx convex run automations/seed:seedComprehensiveIncidentsInternal --args '{"orgId":"<orgId>"}'
 * Optional: pass count (default 10) and startIndex (default 0) to seed a subset
 */
export const seedComprehensiveIncidentsInternal = internalMutation({
  args: { 
    orgId: v.id("orgs"),
    count: v.optional(v.number()),
    startIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ownerId = await getFirstOrgMember(ctx, args.orgId);
    const owner = await ctx.db.get(ownerId);
    if (!owner) throw new Error("Owner profile not found");

    return seedComprehensiveData(
      ctx, 
      args.orgId, 
      ownerId, 
      owner.name,
      args.count ?? 10,
      args.startIndex ?? 0
    );
  },
});

/**
 * Seed comprehensive incidents with varied dates, timelines, and action items.
 * Requires authentication.
 */
export const seedComprehensiveIncidents = mutation({
  args: { 
    orgId: v.id("orgs"),
    count: v.optional(v.number()),
    startIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, { createIfMissing: true });
    await requireOrgAccess(ctx, user._id, args.orgId);

    return seedComprehensiveData(
      ctx, 
      args.orgId, 
      user._id, 
      user.name,
      args.count ?? 10,
      args.startIndex ?? 0
    );
  },
});

async function seedComprehensiveData(
  ctx: any,
  orgId: Id<"orgs">,
  ownerId: Id<"profiles">,
  ownerName: string,
  count: number = 10,
  startIndex: number = 0
) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  const oneMinute = 60 * 1000;

  const createdIncidents: Array<{ id: Id<"incidents">; title: string }> = [];
  const createdTimelines: Array<Id<"timelineEvents">> = [];
  const createdActions: Array<Id<"actionItems">> = [];

  // Get subset of incidents based on count and startIndex
  const incidentsToSeed = INCIDENT_SEED_DATA.slice(startIndex, startIndex + count);

  for (const incident of incidentsToSeed) {
    const startTime = now - incident.daysAgo * oneDay;
    const endTime = incident.durationHours
      ? startTime + incident.durationHours * oneHour
      : undefined;

    // Create incident
    const incidentId = await ctx.db.insert("incidents", {
      orgId,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      service: incident.service,
      startTime,
      endTime,
      impactSummary: incident.impactSummary,
      rootCause: incident.rootCause,
      ownerId,
      createdBy: ownerId,
      escalationLevel: incident.escalationLevel,
      escalatedAt: incident.escalationLevel > 0 ? startTime + 30 * oneMinute : undefined,
    });

    createdIncidents.push({ id: incidentId, title: incident.title });

    await writeAuditLog(ctx, {
      orgId,
      actorId: ownerId,
      actorName: ownerName,
      entityType: "incident",
      entityId: incidentId,
      action: "create",
      changes: JSON.stringify({ created: incident.title, seeded: true }),
    });

    // Create timeline events
    for (const event of incident.timeline) {
      const eventId = await ctx.db.insert("timelineEvents", {
        orgId,
        incidentId,
        occurredAt: startTime + event.offsetMinutes * oneMinute,
        message: event.message,
        actor: event.actor,
        createdBy: ownerId,
      });
      createdTimelines.push(eventId);
    }

    // Create action items
    for (const action of incident.actionItems) {
      const actionId = await ctx.db.insert("actionItems", {
        orgId,
        incidentId,
        title: action.title,
        ownerId,
        priority: action.priority,
        dueDate: startTime + action.dueDaysFromStart * oneDay,
        status: action.status,
        createdBy: ownerId,
      });
      createdActions.push(actionId);

      await writeAuditLog(ctx, {
        orgId,
        actorId: ownerId,
        actorName: ownerName,
        entityType: "actionItem",
        entityId: actionId,
        action: "create",
        changes: JSON.stringify({ created: action.title, seeded: true }),
      });
    }
  }

  return {
    summary: {
      incidentsCreated: createdIncidents.length,
      timelineEventsCreated: createdTimelines.length,
      actionItemsCreated: createdActions.length,
    },
    incidents: createdIncidents,
    message: `Successfully seeded ${createdIncidents.length} incidents with ${createdTimelines.length} timeline events and ${createdActions.length} action items.`,
  };
}
