import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "@agentflow/db";
import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { AppError, registerErrorHandling } from "./errors.js";
import { getDummyHash } from "./lib/password.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { internalRoutes } from "./modules/internal/internal.routes.js";

export type AppDeps = {
  config: Config;
  db: Pool;
};

/** Builds the app without listening, so tests can drive it with `app.inject()`. */
export function buildApp({ config, db }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    // Only the gateway can reach this service, so its X-Forwarded-For header carries the real client IP.
    trustProxy: true,
    // Auth payloads are tiny; refuse anything bigger before parsing it.
    bodyLimit: 16 * 1024,
  });

  registerErrorHandling(app);
  app.register(cookie);
  // Off by default; routes opt in with `config.rateLimit`.
  app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) =>
      new AppError(429, "RATE_LIMITED", `Too many attempts. Try again in ${context.after}.`),
  });

  const auth = createAuthService(db, config);
  app.register(authRoutes, { prefix: "/auth", auth, config });
  app.register(internalRoutes, { prefix: "/internal", auth });

  app.get("/health", async (_request, reply) => {
    try {
      await db.query("SELECT 1");
      return { status: "ok", service: "auth", db: "ok" };
    } catch (error) {
      app.log.warn(error, "health check: database unreachable");
      return reply.code(503).send({ status: "degraded", service: "auth", db: "unreachable" });
    }
  });

  // Compute the timing-safety hash up front instead of on the first unknown-email login.
  app.addHook("onReady", async () => {
    await getDummyHash();
  });

  return app;
}
