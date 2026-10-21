"use client";

import { useProfile } from "@/lib/settings/store";

/** The signed-in user's first name, from Settings → Profile. */
export function ProfileFirstName() {
  const { name } = useProfile();
  return <>{name.trim().split(/\s+/)[0] || "there"}</>;
}
