"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicUser } from "@agentflow/types";

const CurrentUserContext = createContext<PublicUser | null>(null);

/** Hands the server-verified user to client components inside the dashboard. */
export function CurrentUserProvider({ user, children }: { user: PublicUser; children: ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): PublicUser {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error("useCurrentUser must be used inside the dashboard layout");
  return user;
}
