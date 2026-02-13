import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, writeAuditLog } from "./helpers";
import type { Id } from "./_generated/dataModel";

/**
 * Create a new organization. Admin only.
 */
export const createOrg = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);

    const existing = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Organization with slug "${args.slug}" already exists`);
    }

    const now = Date.now();
    const orgId = await ctx.db.insert("orgs", {
      name: args.name,
      slug: args.slug,
      createdAt: now,
    });

    await writeAuditLog(ctx, {
      orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "profile",
      entityId: user._id,
      action: "create",
      changes: JSON.stringify({
        orgName: args.name,
        orgSlug: args.slug,
      }),
    });

    return orgId;
  },
});

/**
 * List organizations. Admins see all; other users see only orgs they belong to.
 */
export const listOrgs = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentUser(ctx);

    const isAdmin = profile.role === "admin";
    if (isAdmin) {
      return await ctx.db.query("orgs").order("desc").collect();
    }

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const orgs = await Promise.all(
      memberships.map((m) => ctx.db.get(m.orgId))
    );

    return orgs.filter((o): o is NonNullable<typeof o> => o !== null);
  },
});

/**
 * List organizations for the current user (for org switcher).
 * Admins see all orgs; other users see only orgs they belong to.
 */
export const listUserOrgs = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentUser(ctx);

    if (profile.role === "admin") {
      const allOrgs = await ctx.db.query("orgs").order("desc").collect();
      return allOrgs.map((org) => ({
        org,
        membership: null,
        isAdminAccess: true,
      }));
    }

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
      .collect();

    const orgsWithMembership = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        return org ? { org, membership: m } : null;
      })
    );

    return orgsWithMembership.filter(
      (o): o is NonNullable<typeof o> => o !== null
    );
  },
});

/**
 * Get a single organization by ID.
 */
export const getOrg = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return await ctx.db.get(args.orgId);
  },
});

/**
 * Update an organization. Admin only.
 */
export const updateOrg = mutation({
  args: {
    orgId: v.id("orgs"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const updates: { name?: string; slug?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.slug !== undefined) {
      const existing = await ctx.db
        .query("orgs")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug!))
        .unique();
      if (existing && existing._id !== args.orgId) {
        throw new Error(`Slug "${args.slug}" is already in use`);
      }
      updates.slug = args.slug;
    }

    if (Object.keys(updates).length === 0) return args.orgId;

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      changes[key] = {
        old: org[key as keyof typeof org],
        new: value,
      };
    }

    await ctx.db.patch(args.orgId, updates);

    await writeAuditLog(ctx, {
      orgId: args.orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "profile",
      entityId: user._id,
      action: "update",
      changes: JSON.stringify({ org: changes }),
    });

    return args.orgId;
  },
});

/**
 * Delete an organization. Admin only. Fails if org has any incidents.
 */
export const deleteOrg = mutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin"]);
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first();

    if (incidents) {
      throw new Error(
        "Cannot delete organization with existing incidents. Remove incidents first."
      );
    }

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.orgId);

    await writeAuditLog(ctx, {
      orgId: args.orgId,
      actorId: user._id,
      actorName: user.name,
      entityType: "profile",
      entityId: user._id,
      action: "delete",
      changes: JSON.stringify({
        orgName: org.name,
        orgSlug: org.slug,
      }),
    });

    return args.orgId;
  },
});
