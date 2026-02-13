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
