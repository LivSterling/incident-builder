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

const SLA_THRESHOLDS_MS: Record<string, number> = {
  SEV1: 30 * 60 * 1000, // 30 min
  SEV2: 2 * 60 * 60 * 1000, // 2h
  SEV3: 8 * 60 * 60 * 1000, // 8h
  SEV4: 24 * 60 * 60 * 1000, // 24h
};

function getTargetEscalationLevel(
  elapsedMs: number,
  severity: string
): number {
  const threshold = SLA_THRESHOLDS_MS[severity] ?? SLA_THRESHOLDS_MS.SEV4;
  if (elapsedMs > 2 * threshold) return 2;
  if (elapsedMs > threshold) return 1;
  return 0;
}

function formatDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function getOrgAdminProfileIds(ctx: MutationCtx, orgId: Id<"orgs">): Promise<Id<"profiles">[]> {
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

async function processOrgEscalations(ctx: MutationCtx, orgId: Id<"orgs">): Promise<{
  evaluated: number;
  affected: number;
  notificationsCreated: number;
}> {
  const systemProfile = await getSystemProfile(ctx);
  const now = Date.now();
  const dateKey = formatDateKey(now);

  const openIncidents = await ctx.db
    .query("incidents")
    .withIndex("by_orgId_status", (q) =>
      q.eq("orgId", orgId).eq("status", "OPEN")
    )
    .collect();

  const orgAdminIds = await getOrgAdminProfileIds(ctx, orgId);

  let affected = 0;
  let notificationsCreated = 0;

  for (const incident of openIncidents) {
    if (!incident.orgId) continue;
    assertOrgId(incident);

    const elapsedMs = now - incident.startTime;
    const targetLevel = getTargetEscalationLevel(elapsedMs, incident.severity);
    const currentLevel = incident.escalationLevel ?? 0;

    if (targetLevel <= currentLevel) continue;

    await ctx.db.patch(incident._id, {
      escalationLevel: targetLevel,
      escalatedAt: now,
    });
    affected++;

    const incidentLink = `/incidents/${incident._id}`;
    const levelLabel = targetLevel === 1 ? "Level 1" : "Level 2";
    const title = `Incident escalated to ${levelLabel}: ${incident.title}`;
    const body = `Incident "${incident.title}" (${incident.severity}) has been open past SLA and escalated to ${levelLabel}.`;

    await writeAuditLog(ctx, {
      orgId: incident.orgId,
      actorId: systemProfile._id,
      actorName: systemProfile.name,
      entityType: "incident",
      entityId: incident._id,
      action: "automationEscalation",
      changes: JSON.stringify({
        escalationLevel: { old: currentLevel, new: targetLevel },
        escalatedAt: now,
      }),
    });

    const recipients = new Set<Id<"profiles">>([incident.ownerId]);
    orgAdminIds.forEach((id) => recipients.add(id));

    for (const userId of recipients) {
      const dedupeKey = `incident_escalation:${incident._id}:${targetLevel}:${userId}:${dateKey}`;
      const notifId = await createNotificationIfNotExists(ctx, {
        orgId: incident.orgId,
        userId,
        type: "INCIDENT_ESCALATION",
        entityType: "incident",
        entityId: incident._id,
        title,
        body,
        link: incidentLink,
        dedupeKey,
      });
      if (notifId) notificationsCreated++;
    }
  }

  return {
    evaluated: openIncidents.length,
    affected,
    notificationsCreated,
  };
}

/**
 * Process escalations for a single org. Used by cron (all orgs) and manual trigger (one org).
 */
async function runForOrgs(
  ctx: MutationCtx,
  orgIds: Id<"orgs">[]
): Promise<void> {
  for (const orgId of orgIds) {
    const org = await ctx.db.get(orgId);
    if (!org) continue;
      const runId = await ctx.db.insert("automationRuns", {
        orgId,
        jobName: "escalateStaleIncidents",
        startedAt: Date.now(),
        status: "RUNNING",
        counts: { evaluated: 0, affected: 0, notificationsCreated: 0 },
      });

      try {
        const result = await processOrgEscalations(ctx, orgId);

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
}

/**
 * Scheduled job: escalate stale incidents past SLA.
 * Runs every 15 minutes via cron.
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("orgs").collect();
    await runForOrgs(ctx, orgs.map((o) => o._id));
  },
});

/**
 * Internal: run escalation for a single org. Used by manual trigger.
 */
export const runForOrg = internalMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await runForOrgs(ctx, [args.orgId]);
  },
});
