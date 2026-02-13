/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actionItems from "../actionItems.js";
import type * as auditLogs from "../auditLogs.js";
import type * as automations_digest from "../automations/digest.js";
import type * as automations_escalation from "../automations/escalation.js";
import type * as automations_index from "../automations/index.js";
import type * as automations_reminders from "../automations/reminders.js";
import type * as automations_seed from "../automations/seed.js";
import type * as crons from "../crons.js";
import type * as digests from "../digests.js";
import type * as helpers from "../helpers.js";
import type * as incidents from "../incidents.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as orgMembers from "../orgMembers.js";
import type * as orgs from "../orgs.js";
import type * as seed from "../seed.js";
import type * as timeline from "../timeline.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actionItems: typeof actionItems;
  auditLogs: typeof auditLogs;
  "automations/digest": typeof automations_digest;
  "automations/escalation": typeof automations_escalation;
  "automations/index": typeof automations_index;
  "automations/reminders": typeof automations_reminders;
  "automations/seed": typeof automations_seed;
  crons: typeof crons;
  digests: typeof digests;
  helpers: typeof helpers;
  incidents: typeof incidents;
  migrations: typeof migrations;
  notifications: typeof notifications;
  orgMembers: typeof orgMembers;
  orgs: typeof orgs;
  seed: typeof seed;
  timeline: typeof timeline;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
