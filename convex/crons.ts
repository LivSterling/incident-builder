import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "escalateStaleIncidents",
  { minutes: 15 },
  internal.automations.escalation.run
);

crons.cron(
  "notifyDueActionItems",
  "0 9 * * *", // Daily at 9am UTC
  internal.automations.reminders.run
);

crons.cron(
  "sendWeeklyDigest",
  "0 9 * * 1", // Mondays at 9am UTC
  internal.automations.digest.run
);

export default crons;
