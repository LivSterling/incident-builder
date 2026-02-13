import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type OrgId = Id<"orgs">;

const WRITABLE_ROLES = ["admin", "editor"] as const;
export type ProfileRole = "admin" | "editor" | "viewer";

/**
 * Get or create a profile for the current Clerk user.
 * Used on first authenticated request to sync Clerk user -> Convex profile.
 * Call from mutations only (requires write access to create).
 */
export async function getOrCreateProfile(ctx: MutationCtx): Promise<Doc<"profiles">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();

  if (existing) {
    return existing;
  }

  const name =
    identity.name ??
    ([identity.givenName, identity.familyName].filter(Boolean).join(" ") || "Unknown");
  const email = identity.email ?? "";

  const profileId = await ctx.db.insert("profiles", {
    userId: identity.subject,
    role: "viewer",
    name,
    email,
    imageUrl: identity.pictureUrl,
  });

  const created = await ctx.db.get(profileId);
  if (!created) {
    throw new Error("Failed to create profile");
  }
  return created;
}

/**
 * Get the current authenticated user's profile.
 * - From mutations: creates profile if missing (first sign-in sync)
 * - From queries: throws if profile not found (client should call syncProfile first)
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
  options?: { createIfMissing?: boolean }
): Promise<Doc<"profiles">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();

  if (profile) {
    return profile;
  }

  if (options?.createIfMissing) {
    return getOrCreateProfile(ctx as MutationCtx);
  }

  throw new Error("Profile not found. Please sign in again.");
}

/**
 * Get current user and require one of the allowed roles. Throws if not allowed.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: readonly ProfileRole[],
  options?: { createIfMissing?: boolean }
): Promise<Doc<"profiles">> {
  const user = await getCurrentUser(ctx, options);
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Insufficient permissions. Required role: ${allowedRoles.join(" or ")}`);
  }
  return user;
}

export type AuditLogParams = {
  orgId: Id<"orgs">;
  actorId: Id<"profiles">;
  actorName: string;
  entityType:
    | "incident"
    | "timeline"
    | "actionItem"
    | "profile"
    | "automation"
    | "digest";
  entityId:
    | Id<"incidents">
    | Id<"timelineEvents">
    | Id<"actionItems">
    | Id<"profiles">
    | Id<"automationRuns">
    | Id<"digests">;
  action:
    | "create"
    | "update"
    | "delete"
    | "statusChange"
    | "autoCreate"
    | "automationEscalation"
    | "automationReminder";
  changes: string;
};

/**
 * Write an audit log entry. Call from mutations after making changes.
 */
export async function writeAuditLog(ctx: MutationCtx, params: AuditLogParams): Promise<void> {
  await ctx.db.insert("auditLogs", {
    orgId: params.orgId,
    actorId: params.actorId,
    actorName: params.actorName,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    changes: params.changes,
    timestamp: Date.now(),
  });
}

/**
 * Assert that a document has orgId (for backwards compat with pre-migration data).
 * Throws if orgId is missing - run migrateToOrgs.
 */
export function assertOrgId<T extends { orgId?: Id<"orgs"> }>(
  doc: T,
  message = "Organization scope missing. Run migrations.migrateToOrgs."
): asserts doc is T & { orgId: Id<"orgs"> } {
  if (!doc.orgId) throw new Error(message);
}

/**
 * Verify the current user is a member of the given organization. Throws if not.
 */
export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  orgId: Id<"orgs">
): Promise<void> {
  const membership = await ctx.db
    .query("orgMembers")
    .withIndex("by_orgId_profileId", (q) =>
      q.eq("orgId", orgId).eq("profileId", profileId)
    )
    .unique();

  if (!membership) {
    throw new Error("You do not have access to this organization");
  }
}

/**
 * Verify the user has access to the given organization. Admins can access any org;
 * other users must be members.
 */
export async function requireOrgAccess(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  orgId: Id<"orgs">
): Promise<void> {
  const profile = await ctx.db.get(profileId);
  if (profile?.role === "admin") {
    return; // Admins can access any org
  }
  await requireOrgMembership(ctx, profileId, orgId);
}

/**
 * Get or create the system profile used as actor for automated actions.
 * Uses a reserved userId that does not correspond to a real user.
 */
export async function getSystemProfile(ctx: MutationCtx): Promise<Doc<"profiles">> {
  const SYSTEM_USER_ID = "convex-automation-system";
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", SYSTEM_USER_ID))
    .unique();

  if (existing) {
    return existing;
  }

  const profileId = await ctx.db.insert("profiles", {
    userId: SYSTEM_USER_ID,
    role: "admin",
    name: "System",
    email: "system@automation.local",
  });

  const created = await ctx.db.get(profileId);
  if (!created) {
    throw new Error("Failed to create system profile");
  }
  return created;
}

/**
 * Check if a notification with the given dedupeKey already exists.
 * Used for idempotency to avoid duplicate notifications per user per day.
 */
export async function notificationWithDedupeKeyExists(
  ctx: QueryCtx | MutationCtx,
  dedupeKey: string
): Promise<boolean> {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
    .first();
  return existing !== null;
}

/**
 * Create a notification if one with the same dedupeKey does not already exist.
 * Returns the created notification ID or null if skipped (duplicate).
 */
export async function createNotificationIfNotExists(
  ctx: MutationCtx,
  params: {
    orgId: Id<"orgs">;
    userId: Id<"profiles">;
    type: "INCIDENT_ESCALATION" | "ACTION_DUE_SOON" | "ACTION_OVERDUE" | "WEEKLY_DIGEST";
    entityType: "incident" | "actionItem" | "digest";
    entityId: string;
    title: string;
    body: string;
    link: string;
    dedupeKey: string;
  }
): Promise<Id<"notifications"> | null> {
  const exists = await notificationWithDedupeKeyExists(ctx, params.dedupeKey);
  if (exists) {
    return null;
  }

  return await ctx.db.insert("notifications", {
    orgId: params.orgId,
    userId: params.userId,
    type: params.type,
    entityType: params.entityType,
    entityId: params.entityId,
    title: params.title,
    body: params.body,
    link: params.link,
    dedupeKey: params.dedupeKey,
    createdAt: Date.now(),
  });
}

/**
 * Roles that can write (create/update/delete). Use with requireRole for mutations.
 */
export { WRITABLE_ROLES };
