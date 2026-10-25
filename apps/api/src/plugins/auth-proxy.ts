import proxy from "@fastify/http-proxy";
import type { FastifyInstance } from "fastify";
import { AppError } from "../errors.js";

/**
 * Public /v1/auth/* → auth service /auth/*. Only this prefix is forwarded, so the auth service's
 * /internal/* routes are unreachable from outside. Bodies and Set-Cookie headers pass through untouched.
 */
export function registerAuthProxy(app: FastifyInstance, upstream: string) {
  app.register(proxy, {
    upstream,
    prefix: "/v1/auth",
    rewritePrefix: "/auth",
    replyOptions: {
      // Replace rather than append: the auth service trusts this header for rate limiting,
      // so it must hold exactly one IP that the gateway itself determined.
      rewriteRequestHeaders: (request, headers) => ({ ...headers, "x-forwarded-for": request.ip }),
      // Could not reach the service at all (refused, reset, timed out). Its own error responses
      // are not errors here — they pass through unchanged.
      onError: (reply, { error }) => {
        reply.log.error(error, "auth service request failed");
        reply.send(new AppError(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable."));
      },
    },
  });
}
