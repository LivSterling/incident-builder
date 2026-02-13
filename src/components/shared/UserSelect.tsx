"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface UserSelectProps {
  orgId: Id<"orgs"> | null;
  value?: Id<"profiles">;
  onValueChange?: (value: Id<"profiles">) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UserSelect({
  orgId,
  value,
  onValueChange,
  placeholder = "Select owner",
  disabled,
}: UserSelectProps) {
  const users = useQuery(
    api.users.listUsers,
    orgId ? { orgId } : "skip"
  );

  if (!orgId || users === undefined) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading users..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => v && onValueChange?.(v as Id<"profiles">)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user._id} value={user._id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
