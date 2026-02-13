import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { createNotificationIfNotExists } from "../helpers";

/**
 * Get the most recent Monday 00:00 UTC as ISO date string (YYYY-MM-DD).
 * For MVP we use UTC; can be extended to org timezone (America/New_York).
 */
function getWeekStartDate(now: number): string {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function getOrgAdminProfileIds(
  ctx: MutationCtx,
  orgId: Id<"orgs">
): Promise<Id<"profiles">[]> {
  const members = await ctx.db
    .query("orgMembers")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .collect();

  const adminIds: Id<"profiles">[] = [];
  for (const m of members) {
    const profile = await ctx.db.get(m.profileId);
    if (profile?.role === "admin") {
      adminIds.push(profile._id);
    }
  }
  return adminIds;
}

async function processOrgDigest(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
  weekStartDate: string,
  now: number
): Promise<{ notificationsCreated: number }> {
  const existingDigest = await ctx.db
    .query("digests")
    .withIndex("by_orgId_weekStartDate", (q) =>
      q.eq("orgId", orgId).eq("weekStartDate", weekStartDate)
    )
    .first();

  if (existingDigest) {
    return { notificationsCreated: 0 };
  }

  const openIncidents = await ctx.db
    .query("incidents")
    .withIndex("by_orgId_status", (q) =>
      q.eq("orgId", orgId).eq("status", "OPEN")
    )
    .collect();

  const openBySeverity = {
    SEV1: openIncidents.filter((i) => i.severity === "SEV1").length,
    SEV2: openIncidents.filter((i) => i.severity === "SEV2").length,
    SEV3: openIncidents.filter((i) => i.severity === "SEV3").length,
    SEV4: openIncidents.filter((i) => i.severity === "SEV4").length,
  };

  const allActionItems = await ctx.db
    .query("actionItems")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .collect();

  const overdueActionItems = allActionItems.filter(
    (item) => item.status !== "DONE" && item.dueDate < now
  );
  const overdueActionsCount = overdueActionItems.length;

  const weekStartMs = new Date(weekStartDate).getTime();
  const topIncidents = openIncidents
    .map((inc) => ({
      id: inc._id,
      title: inc.title,
      severity: inc.severity,
      daysOpen: Math.floor((now - inc.startTime) / (24 * 60 * 60 * 1000)),
      startTime: inc.startTime,
    }))
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 5)
    .map(({ startTime, ...rest }) => rest);

  const topActions = await Promise.all(
    overdueActionItems
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 5)
      .map(async (item) => {
        const incident = await ctx.db.get(item.incidentId);
        return {
          id: item._id,
          incidentId: item.incidentId,
          title: item.title,
          daysOverdue: Math.floor((now - item.dueDate) / (24 * 60 * 60 * 1000)),
          incidentTitle: incident?.title ?? "Unknown",
        };
      })
  );

  const digestId = await ctx.db.insert("digests", {
    orgId,
    weekStartDate,
    summary: {
      openBySeverity,
      overdueActionsCount,
      topIncidents: topIncidents.map((i) => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        daysOpen: i.daysOpen,
      })),
      topActions,
    },
    createdAt: now,
  });

  const orgAdminIds = await getOrgAdminProfileIds(ctx, orgId);
  let notificationsCreated = 0;

  const digestLink = `/digests/${digestId}`;
  const title = `Weekly digest: ${weekStartDate}`;
  const body = `Open incidents: SEV1=${openBySeverity.SEV1}, SEV2=${openBySeverity.SEV2}, SEV3=${openBySeverity.SEV3}, SEV4=${openBySeverity.SEV4}. Overdue action items: ${overdueActionsCount}.`;

  for (const userId of orgAdminIds) {
    const dedupeKey = `weekly_digest:${orgId}:${weekStartDate}:${userId}`;
    const notifId = await createNotificationIfNotExists(ctx, {
      orgId,
      userId,
      type: "WEEKLY_DIGEST",
      entityType: "digest",
      entityId: digestId,
      title,
      body,
      link: digestLink,
      dedupeKey,
    });
    if (notifId) notificationsCreated++;
  }

  return { notificationsCreated };
}

/**
 * Scheduled job: send weekly digest per org.
 * Runs Monday at 9am UTC via cron.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const weekStartDate = getWeekStartDate(now);

    const orgs = await ctx.db.query("orgs").collect();

    for (const org of orgs) {
      const runId = await ctx.db.insert("automationRuns", {
        orgId: org._id,
        jobName: "sendWeeklyDigest",
        startedAt: now,
        status: "RUNNING",
        counts: { evaluated: 1, affected: 0, notificationsCreated: 0 },
      });

      try {
        const result = await processOrgDigest(ctx, org._id, weekStartDate, now);

        await ctx.db.patch(runId, {
          finishedAt: Date.now(),
          status: "SUCCESS",
          counts: {
            evaluated: 1,
            affected: result.notificationsCreated > 0 ? 1 : 0,
            notificationsCreated: result.notificationsCreated,
          },
        });
      } catch (err) {
        await ctx.db.patch(runId, {
          finishedAt: Date.now(),
          status: "ERROR",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }
  },
});

/**
 * Internal: run digest for a single org. Used by manual trigger.
 */
export const runForOrg = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return;

    const now = Date.now();
    const weekStartDate = getWeekStartDate(now);

    const runId = await ctx.db.insert("automationRuns", {
      orgId: args.orgId,
      jobName: "sendWeeklyDigest",
      startedAt: now,
      status: "RUNNING",
      counts: { evaluated: 1, affected: 0, notificationsCreated: 0 },
    });

    try {
      const result = await processOrgDigest(
        ctx,
        args.orgId,
        weekStartDate,
        now
      );

      await ctx.db.patch(runId, {
        finishedAt: Date.now(),
        status: "SUCCESS",
        counts: {
          evaluated: 1,
          affected: result.notificationsCreated > 0 ? 1 : 0,
          notificationsCreated: result.notificationsCreated,
        },
      });
    } catch (err) {
      await ctx.db.patch(runId, {
        finishedAt: Date.now(),
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});
