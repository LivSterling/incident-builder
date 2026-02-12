"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Incident Postmortem Builder</h1>
      <p className="text-center text-muted-foreground max-w-md">
        Build and share incident postmortems with your team.
      </p>
      <div className="flex gap-4">
        <SignedOut>
          <Button asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </SignedOut>
        <SignedIn>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </SignedIn>
      </div>
    </div>
  );
}
