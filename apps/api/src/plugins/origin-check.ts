import type { FastifyInstance } from "fastify";
import { AppError } from "../errors.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defence in depth (SameSite=Lax cookies are the first line): a browser always sends Origin on
 * cross-site POSTs, so reject state-changing requests from origins we don't serve. Requests without
 * an Origin header (curl, server-to-server) are not browser CSRF and pass through.
 */
export function registerOriginCheck(app: FastifyInstance, allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins);

  app.addHook("onRequest", async (request) => {
    const origin = request.headers.origin;
    if (UNSAFE_METHODS.has(request.method) && origin && !allowed.has(origin)) {
      throw new AppError(403, "FORBIDDEN_ORIGIN", "Requests from this origin are not allowed.");
    }
  });
}
