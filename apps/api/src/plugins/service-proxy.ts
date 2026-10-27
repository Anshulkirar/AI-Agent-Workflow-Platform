import proxy from "@fastify/http-proxy";
import type { FastifyInstance } from "fastify";
import { AppError, serviceUnavailable } from "../errors.js";
import type { ServiceRoute } from "../services.js";
import { withIdentityHeaders } from "./require-session.js";

/**
 * Forwards `<prefix>/*` to `<upstream><rewritePrefix>/*`. Nothing outside a registered prefix is
 * reachable, which is what keeps a service's `/internal/*` routes private. Bodies, status codes and
 * Set-Cookie headers pass through unchanged.
 */
export function registerServiceProxy(app: FastifyInstance, service: ServiceRoute, timeoutMs: number) {
  // Own scope, so the session guard applies to this service's routes only.
  app.register(async (scope) => {
    if (service.access === "session") scope.addHook("preHandler", scope.requireSession);

    await scope.register(proxy, {
      upstream: service.upstream,
      prefix: service.prefix,
      rewritePrefix: service.rewritePrefix,
      undici: { connectTimeout: 3_000, headersTimeout: timeoutMs, bodyTimeout: timeoutMs },
      replyOptions: {
        rewriteRequestHeaders: (request, headers) => {
          const forwarded = {
            ...headers,
            // Replace rather than append: services trust this for per-client rate limits,
            // so it must hold exactly one IP that the gateway itself determined.
            "x-forwarded-for": request.ip,
            // Same id in gateway and service logs, so one request can be traced across both.
            "x-request-id": request.id,
          };
          if (service.access === "public") return forwarded;

          // Protected services learn who is calling from verified headers, never from the session
          // token: if one of them is compromised, it has no cookie to replay against other services.
          delete forwarded.cookie;
          return withIdentityHeaders(request, forwarded);
        },
        // The service could not be reached or was too slow. Its own error responses are not
        // errors here — they pass through unchanged.
        onError: (reply, { error }) => {
          reply.log.error({ err: error, service: service.name }, "upstream request failed");
          const timedOut = "statusCode" in error && error.statusCode === 504;
          reply.send(
            timedOut
              ? new AppError(504, "GATEWAY_TIMEOUT", "The service took too long to respond.")
              : serviceUnavailable(),
          );
        },
      },
    });
  });
}
