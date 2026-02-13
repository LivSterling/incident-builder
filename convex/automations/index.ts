import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getCurrentUser, requireOrgAccess } from "../helpers";

/**
 * List recent automation runs for an org. Admin only.
 */
export const listAutomationRuns = query({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx);
    await requireOrgAccess(ctx, profile._id, args.orgId);

    if (profile.role !== "admin") {
      throw new Error("Insufficient permissions. Admin only.");
    }

    const limit = args.limit ?? 10;

    const runs = await ctx.db
      .query("automationRuns")
      .withIndex("by_orgId_startedAt", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(limit);

    return runs;
  },
});

/**
 * Manually trigger escalation job for an org. Admin only.
 */
export const runEscalationNow = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx, { createIfMissing: true });
    await requireOrgAccess(ctx, profile._id, args.orgId);

    if (profile.role !== "admin") {
      throw new Error("Insufficient permissions. Admin only.");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.automations.escalation.runForOrg,
      { orgId: args.orgId }
    );

    return { scheduled: true };
  },
});

/**
 * Manually trigger reminders job for an org. Admin only.
 */
export const runRemindersNow = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx, { createIfMissing: true });
    await requireOrgAccess(ctx, profile._id, args.orgId);

    if (profile.role !== "admin") {
      throw new Error("Insufficient permissions. Admin only.");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.automations.reminders.runForOrg,
      { orgId: args.orgId }
    );

    return { scheduled: true };
  },
});

/**
 * Manually trigger weekly digest for an org. Admin only.
 */
export const runDigestNow = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx, { createIfMissing: true });
    await requireOrgAccess(ctx, profile._id, args.orgId);

    if (profile.role !== "admin") {
      throw new Error("Insufficient permissions. Admin only.");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.automations.digest.runForOrg,
      { orgId: args.orgId }
    );

    return { scheduled: true };
  },
});
