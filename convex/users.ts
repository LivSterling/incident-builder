import { mutation, query } from "./_generated/server";
import { getCurrentUser, getOrCreateProfile } from "./helpers";

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
