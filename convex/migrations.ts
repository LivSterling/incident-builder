import { mutation } from "./_generated/server";

/**
 * One-time migration to add org scoping to existing data.
 * Run this from the Convex dashboard (Functions -> migrations:migrateToOrgs -> Run)
 * after deploying the org schema changes.
 *
 * Note: No auth required - dashboard runs have no user context. The migration
 * is protected by only running when no orgs exist yet.
 *
 * Creates a "Default Organization", adds all profiles to it,
 * and assigns all incidents, actionItems, timelineEvents, and auditLogs to it.
 */
export const migrateToOrgs = mutation({
  args: {},
  handler: async (ctx) => {

    const existingOrgs = await ctx.db.query("orgs").collect();
    if (existingOrgs.length > 0) {
      throw new Error(
        "Migration already run: organizations exist. Create orgs manually or contact support."
      );
    }

    const now = Date.now();

    const defaultOrgId = await ctx.db.insert("orgs", {
      name: "Default Organization",
      slug: "default",
      createdAt: now,
    });

    const profiles = await ctx.db.query("profiles").collect();
    for (const profile of profiles) {
      await ctx.db.insert("orgMembers", {
        orgId: defaultOrgId,
        profileId: profile._id,
        joinedAt: now,
      });
    }

    const incidents = await ctx.db.query("incidents").collect();
    for (const incident of incidents) {
      await ctx.db.patch(incident._id, { orgId: defaultOrgId });
    }

    const actionItems = await ctx.db.query("actionItems").collect();
    for (const item of actionItems) {
      await ctx.db.patch(item._id, { orgId: defaultOrgId });
    }

    const timelineEvents = await ctx.db.query("timelineEvents").collect();
    for (const event of timelineEvents) {
      await ctx.db.patch(event._id, { orgId: defaultOrgId });
    }

    const auditLogs = await ctx.db.query("auditLogs").collect();
    for (const log of auditLogs) {
      await ctx.db.patch(log._id, { orgId: defaultOrgId });
    }

    return {
      defaultOrgId,
      profilesCount: profiles.length,
      incidentsCount: incidents.length,
      actionItemsCount: actionItems.length,
      timelineEventsCount: timelineEvents.length,
      auditLogsCount: auditLogs.length,
    };
  },
});
