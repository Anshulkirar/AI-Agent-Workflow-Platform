import type { Pool } from "@agentflow/db";
import Fastify, { type FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { Config } from "./config.js";
import { registerErrorHandling } from "./errors.js";
import { RunsRepository } from "./modules/runs/runs.repository.js";
import { runsRoutes } from "./modules/runs/runs.routes.js";

export type AppDeps = { config: Config; db: Pool; redis: Redis };

export function buildApp({ config, db, redis }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: true,
    requestIdHeader: "x-request-id",
    bodyLimit: 256 * 1024,
  });

  registerErrorHandling(app);
  runsRoutes(app, new RunsRepository(db), redis, config);

  app.get("/health", async (_request, reply) => {
    try {
      await Promise.all([db.query("SELECT 1"), redis.ping()]);
      return { status: "ok", service: "execution", db: "ok", redis: "ok" };
    } catch (error) {
      app.log.warn(error, "health check dependencies unreachable");
      return reply.code(503).send({
        status: "degraded",
        service: "execution",
        db: "unreachable",
      });
    }
  });

  return app;
}
