import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  getSystemProfile,
  writeAuditLog,
  createNotificationIfNotExists,
  assertOrgId,
} from "../helpers";

function formatDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getStartOfDayMs(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
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

async function processOrgReminders(ctx: MutationCtx, orgId: Id<"orgs">): Promise<{
  evaluated: number;
  affected: number;
  notificationsCreated: number;
}> {
  const systemProfile = await getSystemProfile(ctx);
  const now = Date.now();
  const todayStart = getStartOfDayMs(now);
  const dueSoonEnd = todayStart + 3 * 24 * 60 * 60 * 1000; // +3 days
  const dateKey = formatDateKey(now);

  const allItems = await ctx.db
    .query("actionItems")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .collect();

  const itemsToNotify = allItems.filter(
    (item) =>
      item.status !== "DONE" &&
      item.dueDate !== undefined &&
      (item.dueDate < todayStart || (item.dueDate >= todayStart && item.dueDate <= dueSoonEnd))
  );

  const orgAdminIds = await getOrgAdminProfileIds(ctx, orgId);

  let notificationsCreated = 0;

  for (const item of itemsToNotify) {
    if (!item.orgId) continue;
    assertOrgId(item);

    const incident = await ctx.db.get(item.incidentId);
    const incidentTitle = incident?.title ?? "Unknown incident";

    const isOverdue = item.dueDate < todayStart;
    const type = isOverdue ? "ACTION_OVERDUE" : "ACTION_DUE_SOON";
    const dedupeSuffix = isOverdue ? "overdue" : "dueSoon";

    const title = isOverdue
      ? `Overdue: ${item.title}`
      : `Due soon: ${item.title}`;
    const body = isOverdue
      ? `Action item "${item.title}" for incident "${incidentTitle}" is overdue.`
      : `Action item "${item.title}" for incident "${incidentTitle}" is due within 3 days.`;
    const link = `/incidents/${item.incidentId}`;

    const recipients = new Set<Id<"profiles">>([item.ownerId]);
    orgAdminIds.forEach((id) => recipients.add(id));

    let sentAny = false;
    for (const userId of recipients) {
      const dedupeKey = `action_${dedupeSuffix}:${item._id}:${userId}:${dateKey}`;
      const notifId = await createNotificationIfNotExists(ctx, {
        orgId: item.orgId,
        userId,
        type,
        entityType: "actionItem",
        entityId: item._id,
        title,
        body,
        link,
        dedupeKey,
      });
      if (notifId) {
        notificationsCreated++;
        sentAny = true;
      }
    }
    if (sentAny) {
      await writeAuditLog(ctx, {
        orgId: item.orgId,
        actorId: systemProfile._id,
        actorName: systemProfile.name,
        entityType: "actionItem",
        entityId: item._id,
        action: "automationReminder",
        changes: JSON.stringify({
          type,
          dueDate: item.dueDate,
          incidentTitle,
        }),
      });
    }
  }

  return {
    evaluated: allItems.filter((i) => i.status !== "DONE").length,
    affected: itemsToNotify.length,
    notificationsCreated,
  };
}

/**
 * Scheduled job: notify about due soon and overdue action items.
 * Runs daily at 9am UTC via cron.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("orgs").collect();

    for (const org of orgs) {
      const runId = await ctx.db.insert("automationRuns", {
        orgId: org._id,
        jobName: "notifyDueActionItems",
        startedAt: Date.now(),
        status: "RUNNING",
        counts: { evaluated: 0, affected: 0, notificationsCreated: 0 },
      });

      try {
        const result = await processOrgReminders(ctx, org._id);

        await ctx.db.patch(runId, {
          finishedAt: Date.now(),
          status: "SUCCESS",
          counts: result,
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
 * Internal: run reminders for a single org. Used by manual trigger.
 */
export const runForOrg = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return;

    const runId = await ctx.db.insert("automationRuns", {
      orgId: args.orgId,
      jobName: "notifyDueActionItems",
      startedAt: Date.now(),
      status: "RUNNING",
      counts: { evaluated: 0, affected: 0, notificationsCreated: 0 },
    });

    try {
      const result = await processOrgReminders(ctx, args.orgId);

      await ctx.db.patch(runId, {
        finishedAt: Date.now(),
        status: "SUCCESS",
        counts: result,
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
