import type { Pool } from "@agentflow/db";
import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { registerErrorHandling } from "./errors.js";
import { AgentsRepository } from "./modules/agents/agents.repository.js";
import { agentsRoutes } from "./modules/agents/agents.routes.js";

export type AppDeps = { config: Config; db: Pool };

export function buildApp({ config, db }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: true,
    requestIdHeader: "x-request-id",
    bodyLimit: 256 * 1024,
  });
  
  registerErrorHandling(app);
  agentsRoutes(app, new AgentsRepository(db));
  app.get("/health", async (_request, reply) => {
    try {
      await db.query("SELECT 1");
      return { status: "ok", service: "agent", db: "ok" };
    } catch (error) {
      app.log.warn(error, "health check: database unreachable");
      return reply
        .code(503)
        .send({ status: "degraded", service: "agent", db: "unreachable" });
    }
  });
  return app;
}
