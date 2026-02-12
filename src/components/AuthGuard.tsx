"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Wrapper that requires authentication.
 * - Loading: shows skeleton
 * - Not authenticated: redirects to /sign-in
 * - Authenticated: renders children
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <AuthGuardSkeleton />;
  }

  if (!isSignedIn) {
    return <AuthGuardSkeleton />;
  }

  return <>{children}</>;
}

function AuthGuardSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-4 w-64">
        <div className="h-8 bg-muted animate-pulse rounded-md" />
        <div className="h-4 bg-muted animate-pulse rounded-md w-3/4" />
        <div className="h-4 bg-muted animate-pulse rounded-md w-1/2" />
        <div className="h-12 bg-muted animate-pulse rounded-md mt-4" />
      </div>
    </div>
  );
}
