"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Wrapper that requires authentication.
 * Uses Convex auth state (not just Clerk) so we don't render Convex-dependent
 * children until the Convex backend has validated the token.
 * - Loading: shows skeleton
 * - Not authenticated: redirects to /sign-in
 * - Authenticated: renders children
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <AuthGuardSkeleton />;
  }

  if (!isAuthenticated) {
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
