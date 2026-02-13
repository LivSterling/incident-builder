import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireOrgAccess, requireOrgMembership, writeAuditLog } from "./helpers";

/**
 * Add a user to an organization. Admin only.
 */
export const addMember = mutation({
  args: {
    orgId: v.id("orgs"),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);
    await requireOrgAccess(ctx, user._id, args.orgId);

    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_profileId", (q) =>
        q.eq("orgId", args.orgId).eq("profileId", args.profileId)
      )
      .unique();

    if (existing) {
      throw new Error("User is already a member of this organization");
    }

    const now = Date.now();
    await ctx.db.insert("orgMembers", {
      orgId: args.orgId,
      profileId: args.profileId,
      joinedAt: now,
    });

    await writeAuditLog(ctx, {
      orgId: args.orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "profile",
      entityId: args.profileId,
      action: "create",
      changes: JSON.stringify({
        addedMember: profile.email,
        addedMemberName: profile.name,
      }),
    });

    return args.orgId;
  },
});

/**
 * Remove a user from an organization. Admin only.
 */
export const removeMember = mutation({
  args: {
    orgId: v.id("orgs"),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);
    await requireOrgAccess(ctx, user._id, args.orgId);

    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId_profileId", (q) =>
        q.eq("orgId", args.orgId).eq("profileId", args.profileId)
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this organization");
    }

    const profile = await ctx.db.get(args.profileId);

    await ctx.db.delete(membership._id);

    await writeAuditLog(ctx, {
      orgId: args.orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "profile",
      entityId: args.profileId,
      action: "delete",
      changes: JSON.stringify({
        removedMember: profile?.email ?? args.profileId,
      }),
    });

    return args.orgId;
  },
});

/**
 * List members of an organization. User must be a member of the org.
 */
export const listOrgMembers = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx);
    await requireOrgMembership(ctx, profile._id, args.orgId);

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const p = await ctx.db.get(m.profileId);
        return p ? { profile: p, joinedAt: m.joinedAt } : null;
      })
    );

    return members.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});
