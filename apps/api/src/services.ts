import type { Config } from "./config.js";

/**
 * One entry per microservice behind the gateway. Adding a service = one entry here plus one
 * `<NAME>_SERVICE_URL` in config.ts. Every service must expose `GET /health` for readiness checks.
 */
export type ServiceRoute = {
  name: string;
  /** Public path on the gateway, e.g. `/v1/agents`. Only paths under a prefix are forwarded. */
  prefix: string;
  /** Base URL of the service, reachable only on the internal network. */
  upstream: string;
  /** Path the prefix maps to on the service, e.g. `/agents`. */
  rewritePrefix: string;
  /**
   * - `public`: forwarded as is; the service handles its own credentials (sign-in, sign-up).
   * - `session`: the gateway requires a valid session first, then forwards the caller's identity
   *   as `x-user-id` / `x-session-id` instead of the session cookie.
   */
  access: "public" | "session";
};

export function serviceRoutes(config: Config): ServiceRoute[] {
  return [
    { name: "auth", prefix: "/v1/auth", upstream: config.AUTH_SERVICE_URL, rewritePrefix: "/auth", access: "public" },
    // { name: "agents", prefix: "/v1/agents", upstream: config.AGENTS_SERVICE_URL, rewritePrefix: "/agents", access: "session" },
  ];
}
