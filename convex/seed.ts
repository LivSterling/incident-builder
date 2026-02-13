import { mutation } from "./_generated/server";
import { requireRole, writeAuditLog, WRITABLE_ROLES } from "./helpers";

/**
 * Seed demo data: 2 incidents with timeline events and action items.
 * VPN Outage (SEV2, MITIGATED) - 3 timeline events, 2 action items (one overdue)
 * Bad Deploy (SEV1, OPEN) - 4 timeline events, 3 action items (one overdue)
 * Requires admin or editor role. Idempotent - skips if data already exists.
 */
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, WRITABLE_ROLES, { createIfMissing: true });

    const existingIncidents = await ctx.db.query("incidents").collect();
    if (existingIncidents.length > 0) {
      return { skipped: true, reason: "Data already exists" };
    }

    let defaultOrg = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", "default"))
      .unique();
    if (!defaultOrg) {
      const now = Date.now();
      const defaultOrgId = await ctx.db.insert("orgs", {
        name: "Default Organization",
        slug: "default",
        createdAt: now,
      });
      await ctx.db.insert("orgMembers", {
        orgId: defaultOrgId,
        profileId: user._id,
        joinedAt: now,
      });
      defaultOrg = await ctx.db.get(defaultOrgId);
    }
    if (!defaultOrg) throw new Error("Failed to create default org");
    const orgId = defaultOrg._id;

    const profiles = await ctx.db.query("profiles").collect();
    const ownerId = profiles[0]?._id ?? user._id;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDaysAgo = now - 3 * oneDay;
    const fiveDaysAgo = now - 5 * oneDay;
    const twoDaysFromNow = now + 2 * oneDay;
    const sevenDaysAgo = now - 7 * oneDay;

    // 1. VPN Outage (SEV2, MITIGATED) - 3 timeline events, 2 action items (one overdue)
    const vpnIncidentId = await ctx.db.insert("incidents", {
      orgId,
      title: "VPN Outage",
      severity: "SEV2",
      status: "MITIGATED",
      service: "Corporate VPN",
      startTime: fiveDaysAgo,
      endTime: fiveDaysAgo + 4 * 60 * 60 * 1000,
      impactSummary:
        "Employees unable to connect to corporate VPN. Remote workers affected. Estimated 40% of workforce impacted.",
      rootCause:
        "Misconfigured firewall rule during routine maintenance blocked VPN authentication traffic.",
      ownerId,
      createdBy: user._id,
    });

    await writeAuditLog(ctx, {
      orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "incident",
      entityId: vpnIncidentId,
      action: "create",
      changes: JSON.stringify({ created: "VPN Outage" }),
    });

    const vpnTimeline = [
      { occurredAt: fiveDaysAgo, message: "First reports of VPN connection failures", actor: "Support Team" },
      {
        occurredAt: fiveDaysAgo + 30 * 60 * 1000,
        message: "Identified firewall as potential cause, began rollback",
        actor: "Network Ops",
      },
      {
        occurredAt: fiveDaysAgo + 4 * 60 * 60 * 1000,
        message: "Firewall rollback complete, VPN restored",
        actor: "Network Ops",
      },
    ];
    for (const ev of vpnTimeline) {
      const eventId = await ctx.db.insert("timelineEvents", {
        orgId,
        incidentId: vpnIncidentId,
        occurredAt: ev.occurredAt,
        message: ev.message,
        actor: ev.actor,
        createdBy: user._id,
      });
      await writeAuditLog(ctx, {
        orgId,
        actorId: user._id,
        actorName: user.name,
        entityType: "timeline",
        entityId: eventId,
        action: "create",
        changes: JSON.stringify({ created: ev }),
      });
    }

    const vpnActionItems = [
      {
        title: "Document firewall change procedure",
        priority: "P1" as const,
        dueDate: sevenDaysAgo - oneDay,
        status: "DONE" as const,
      },
      {
        title: "Implement pre-prod firewall test",
        priority: "P2" as const,
        dueDate: now - 2 * oneDay,
        status: "OPEN" as const,
      },
    ];
    for (const item of vpnActionItems) {
      const itemId = await ctx.db.insert("actionItems", {
        orgId,
        incidentId: vpnIncidentId,
        title: item.title,
        ownerId,
        priority: item.priority,
        dueDate: item.dueDate,
        status: item.status,
        createdBy: user._id,
      });
      await writeAuditLog(ctx, {
        orgId,
        actorId: user._id,
        actorName: user.name,
        entityType: "actionItem",
        entityId: itemId,
        action: "create",
        changes: JSON.stringify({ created: item }),
      });
    }

    // 2. Bad Deploy (SEV1, OPEN) - 4 timeline events, 3 action items (one overdue)
    const deployIncidentId = await ctx.db.insert("incidents", {
      orgId,
      title: "Bad Deploy",
      severity: "SEV1",
      status: "OPEN",
      service: "Payment API",
      startTime: threeDaysAgo,
      impactSummary:
        "Payment processing completely down. All transactions failing. Revenue impact estimated at $50k/hour.",
      ownerId,
      createdBy: user._id,
    });

    await writeAuditLog(ctx, {
      orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "incident",
      entityId: deployIncidentId,
      action: "create",
      changes: JSON.stringify({ created: "Bad Deploy" }),
    });

    const deployTimeline = [
      {
        occurredAt: threeDaysAgo,
        message: "Deployed v2.4.1 to production",
        actor: "CI/CD Pipeline",
      },
      {
        occurredAt: threeDaysAgo + 5 * 60 * 1000,
        message: "Alerts: 100% error rate on payment endpoints",
        actor: "Monitoring",
      },
      {
        occurredAt: threeDaysAgo + 15 * 60 * 1000,
        message: "Identified database migration bug in v2.4.1",
        actor: "Backend Team",
      },
      {
        occurredAt: threeDaysAgo + 45 * 60 * 1000,
        message: "Rollback initiated, awaiting completion",
        actor: "Backend Team",
      },
    ];
    for (const ev of deployTimeline) {
      const eventId = await ctx.db.insert("timelineEvents", {
        orgId,
        incidentId: deployIncidentId,
        occurredAt: ev.occurredAt,
        message: ev.message,
        actor: ev.actor,
        createdBy: user._id,
      });
      await writeAuditLog(ctx, {
        orgId,
        actorId: user._id,
        actorName: user.name,
        entityType: "timeline",
        entityId: eventId,
        action: "create",
        changes: JSON.stringify({ created: ev }),
      });
    }

    const deployActionItems = [
      {
        title: "Add payment API to staging migration tests",
        priority: "P0" as const,
        dueDate: now + oneDay,
        status: "OPEN" as const,
      },
      {
        title: "Implement canary deployments",
        priority: "P1" as const,
        dueDate: now + 5 * oneDay,
        status: "IN_PROGRESS" as const,
      },
      {
        title: "Update deployment runbook",
        priority: "P2" as const,
        dueDate: sevenDaysAgo,
        status: "OPEN" as const,
      },
    ];
    for (const item of deployActionItems) {
      const itemId = await ctx.db.insert("actionItems", {
        orgId,
        incidentId: deployIncidentId,
        title: item.title,
        ownerId,
        priority: item.priority,
        dueDate: item.dueDate,
        status: item.status,
        createdBy: user._id,
      });
      await writeAuditLog(ctx, {
        orgId,
        actorId: user._id,
        actorName: user.name,
        entityType: "actionItem",
        entityId: itemId,
        action: "create",
        changes: JSON.stringify({ created: item }),
      });
    }

    return {
      skipped: false,
      incidentsCreated: 2,
      vpnIncidentId,
      deployIncidentId,
    };
  },
});
