import { SESSION_COOKIE_NAME, type SessionVerification } from "@agentflow/types";
import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import { AppError } from "../errors.js";

declare module "fastify" {
  interface FastifyInstance {
    /** Route guard: `{ preHandler: app.requireSession }`. Sets `request.identity` or answers 401. */
    requireSession: preHandlerAsyncHookHandler;
  }
  interface FastifyRequest {
    identity?: SessionVerification;
  }
}

// Headers the gateway uses to tell downstream services who is calling. Only the gateway may set them.
const IDENTITY_HEADERS = ["x-user-id", "x-session-id"] as const;

const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "You need to sign in to continue.");

export function registerRequireSession(app: FastifyInstance, authServiceUrl: string) {
  // A client could send `x-user-id: <someone else>`; drop such headers before anything else runs.
  app.addHook("onRequest", async (request) => {
    for (const header of IDENTITY_HEADERS) delete request.headers[header];
  });

  const verifyUrl = new URL("/internal/sessions/verify", authServiceUrl);

  app.decorate("requireSession", async function requireSession(request: FastifyRequest) {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (!token) throw unauthenticated();

    let response: Response;
    try {
      response = await fetch(verifyUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(3_000),
      });
    } catch (error) {
      request.log.error(error, "auth service unreachable");
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable.");
    }

    if (response.status === 401 || response.status === 400) throw unauthenticated();
    if (!response.ok) throw new AppError(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable.");

    request.identity = (await response.json()) as SessionVerification;
  });
}

/** For proxies to downstream services: forward the verified identity as headers. */
export function withIdentityHeaders(request: FastifyRequest, headers: Record<string, unknown>) {
  if (!request.identity) return headers;
  return { ...headers, "x-user-id": request.identity.userId, "x-session-id": request.identity.sessionId };
}
