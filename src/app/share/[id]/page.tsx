"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PostmortemView } from "@/components/incidents/PostmortemView";

export default function SharePage() {
  const params = useParams();
  const id = params.id as Id<"incidents">;
  const data = useQuery(api.incidents.getPublicPostmortem, { id });

  if (data === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Loading postmortem...</p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Postmortem Not Found</h1>
          <p className="text-muted-foreground">
            This postmortem may have been removed or the link is invalid.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-foreground hover:text-primary"
          >
            Incident Builder
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <PostmortemView
          incident={data.incident}
          timelineEvents={data.timelineEvents}
          actionItems={data.actionItems}
          showCopyButton={false}
        />
      </main>

      <footer className="border-t px-6 py-4 mt-auto">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          Powered by Incident Builder
        </div>
      </footer>
    </div>
  );
}
