import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { Config } from "./config.js";
import { registerErrorHandling } from "./errors.js";
import { registerHealthRoutes } from "./plugins/health.js";
import { registerOriginCheck } from "./plugins/origin-check.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerRequireSession } from "./plugins/require-session.js";
import { registerServiceProxy } from "./plugins/service-proxy.js";
import { serviceRoutes, type ServiceRoute } from "./services.js";

export type AppDeps = {
  config: Config;
  /** Shared rate-limit store; omit to count in memory (tests, single-process dev). */
  redis?: Redis;
  /** Defaults to the registry in services.ts; tests pass fakes. */
  services?: ServiceRoute[];
};

/**
 * The public entry point. It owns no data: it checks where requests come from, limits how often
 * they come, works out who is calling, and forwards each path prefix to the service that owns it.
 */
export function buildApp({ config, redis, services = serviceRoutes(config) }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: config.TRUST_PROXY,
    // Our own id for every request (never the client's), forwarded to services as x-request-id.
    genReqId: () => randomUUID(),
  });

  registerErrorHandling(app);
  // Hand the id back so a user can quote it in a bug report and it matches the logs.
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  // Order matters: hooks run in registration order, and routes registered after the rate-limit
  // plugin are the ones it applies to.
  app.register(cookie);
  registerOriginCheck(app, config.WEB_ORIGINS);
  registerRequireSession(app, config.AUTH_SERVICE_URL);
  registerRateLimit(app, config, redis);

  app.register(async (scope) => registerHealthRoutes(scope, services));
  for (const service of services) registerServiceProxy(app, service, config.UPSTREAM_TIMEOUT_MS);

  return app;
}
