import { cookies, headers } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE_NAME, type MeResponse, type PublicUser } from "@agentflow/types";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:4000";

/**
 * The real authentication check, run on the server for every protected render: asks the auth
 * service (via the gateway) whether this browser's session cookie is still valid.
 * `cache` dedupes it within one request, so layouts and pages can all call it.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  // Pass the visitor's address on, or the gateway would rate-limit every page render as this server.
  const forwardedFor = (await headers()).get("x-forwarded-for");
  const response = await fetch(`${API_URL}/v1/auth/me`, {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      ...(forwardedFor && { "x-forwarded-for": forwardedFor }),
    },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  // Fail closed: if auth can't be checked, show an error rather than the dashboard.
  if (!response.ok) throw new Error(`Session check failed with status ${response.status}`);

  return ((await response.json()) as MeResponse).user;
});
