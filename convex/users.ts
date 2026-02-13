import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUser,
  getOrCreateProfile,
  requireRole,
  requireOrgAccess,
  requireOrgMembership,
  writeAuditLog,
} from "./helpers";

/**
 * Sync current Clerk user to Convex profile. Idempotent - safe to call on every app load.
 * Call when user becomes authenticated so subsequent queries have a profile.
 */
export const syncProfile = mutation({
  args: {},
  handler: async (ctx) => {
    return await getOrCreateProfile(ctx);
  },
});

/**
 * Get current user's profile with role.
 */
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/**
 * List all profiles. Admin only. Used for adding users to orgs.
 */
export const listAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db.query("profiles").collect();
  },
});

/**
 * List users in the given organization (for owner dropdowns).
 */
export const listUsers = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx);
    await requireOrgAccess(ctx, profile._id, args.orgId);

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    const profiles = await Promise.all(
      memberships.map((m) => ctx.db.get(m.profileId))
    );

    return profiles.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

/**
 * Set a user's role. Admin only. Must be a member of the org.
 */
export const setUserRole = mutation({
  args: {
    orgId: v.id("orgs"),
    profileId: v.id("profiles"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);
    await requireOrgAccess(ctx, user._id, args.orgId);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    await requireOrgMembership(ctx, args.profileId, args.orgId);

    const oldRole = profile.role;
    await ctx.db.patch(args.profileId, { role: args.role });
    await writeAuditLog(ctx, {
      orgId: args.orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "profile",
      entityId: args.profileId,
      action: "update",
      changes: JSON.stringify({
        role: { old: oldRole, new: args.role },
        targetUser: profile.email,
      }),
    });
    return args.profileId;
  },
});

/**
 * Update current user's profile (name, imageUrl). Admin or editor can update own profile.
 * orgId is required for audit logging.
 */
export const updateProfile = mutation({
  args: {
    orgId: v.id("orgs"),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", "editor", "viewer"], {
      createIfMissing: true,
    });
    await requireOrgMembership(ctx, user._id, args.orgId);

    const updates: { name?: string; imageUrl?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (Object.keys(updates).length === 0) return user._id;

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      changes[key] = { old: user[key as keyof typeof user], new: value };
    }
    await ctx.db.patch(user._id, updates);
    await writeAuditLog(ctx, {
      orgId: args.orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "profile",
      entityId: user._id,
      action: "update",
      changes: JSON.stringify({ profile: changes }),
    });
    return user._id;
  },
});
