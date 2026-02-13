import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireOrgAccess } from "./helpers";

/**
 * List digests for an org, newest first.
 */
export const listDigests = query({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx);
    await requireOrgAccess(ctx, profile._id, args.orgId);

    const limit = args.limit ?? 10;

    const digests = await ctx.db
      .query("digests")
      .withIndex("by_orgId_weekStartDate", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(limit);

    return digests;
  },
});

/**
 * Get a single digest by ID.
 */
export const getDigest = query({
  args: { digestId: v.id("digests") },
  handler: async (ctx, args) => {
    const profile = await getCurrentUser(ctx);

    const digest = await ctx.db.get(args.digestId);
    if (!digest) {
      return null;
    }

    await requireOrgAccess(ctx, profile._id, digest.orgId);

    return digest;
  },
});
