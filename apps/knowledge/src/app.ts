import type { Pool } from "@agentflow/db";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import type { Config } from "./config.js";
import { registerErrorHandling } from "./errors.js";
import { SourcesRepository } from "./modules/sources/sources.repository.js";
import { sourcesRoutes } from "./modules/sources/sources.routes.js";

export type AppDeps = { config: Config; db: Pool };

export function buildApp({ config, db }: AppDeps): FastifyInstance {
  const app = Fastify({ logger: { level: config.LOG_LEVEL }, trustProxy: true, requestIdHeader: "x-request-id", bodyLimit: 256 * 1024 });
  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  app.register(multipart, { limits: { fileSize: config.KNOWLEDGE_MAX_FILE_BYTES, files: 1 } });
  app.addHook("onClose", async () => { await redis.quit(); });
  registerErrorHandling(app);
  sourcesRoutes(app, new SourcesRepository(db), config, async (id) => {
    await redis.rpush("agentflow:knowledge:queue", id);
  });
  app.get("/health", async (_request, reply) => {
    try {
      await db.query("SELECT 1");
      await redis.ping();
      return { status: "ok", service: "knowledge", db: "ok", redis: "ok" };
    } catch (error) {
      app.log.warn(error, "health check: dependency unreachable");
      return reply.code(503).send({ status: "degraded", service: "knowledge" });
    }
  });
  return app;
}
