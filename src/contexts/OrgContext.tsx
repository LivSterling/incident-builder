"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const STORAGE_KEY = "incident-builder-active-org";

type OrgContextValue = {
  activeOrgId: Id<"orgs"> | null;
  setActiveOrgId: (id: Id<"orgs"> | null) => void;
  userOrgs: Array<{
    org: { _id: Id<"orgs">; name: string; slug: string };
    membership: { joinedAt: number } | null;
    isAdminAccess?: boolean;
  }>;
  isLoading: boolean;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [activeOrgId, setActiveOrgIdState] = useState<Id<"orgs"> | null>(null);
  const userOrgsData = useQuery(api.orgs.listUserOrgs, {});

  const setActiveOrgId = useCallback((id: Id<"orgs"> | null) => {
    setActiveOrgIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!userOrgsData) return;

    if (userOrgsData.length === 0) {
      setActiveOrgIdState(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY) as Id<"orgs"> | null;
    const isValidStored =
      stored && userOrgsData.some(({ org }) => org._id === stored);

    if (isValidStored) {
      setActiveOrgIdState(stored);
    } else {
      const first = userOrgsData[0].org._id;
      setActiveOrgIdState(first);
      localStorage.setItem(STORAGE_KEY, first);
    }
  }, [userOrgsData]);

  const value = useMemo<OrgContextValue>(
    () => ({
      activeOrgId,
      setActiveOrgId,
      userOrgs: userOrgsData ?? [],
      isLoading: userOrgsData === undefined,
    }),
    [activeOrgId, setActiveOrgId, userOrgsData]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
