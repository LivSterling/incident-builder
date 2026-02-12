import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getOrCreateProfile, requireRole, writeAuditLog } from "./helpers";

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
 * List all users (for owner dropdowns).
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.db.query("profiles").collect();
  },
});

/**
 * Set a user's role. Admin only.
 */
export const setUserRole = mutation({
  args: {
    profileId: v.id("profiles"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    const user = await getCurrentUser(ctx);
    const oldRole = profile.role;
    await ctx.db.patch(args.profileId, { role: args.role });
    await writeAuditLog(ctx, {
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
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", "editor", "viewer"], {
      createIfMissing: true,
    });
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
