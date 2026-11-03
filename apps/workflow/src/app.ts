import type { Pool } from "@agentflow/db";
import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { registerErrorHandling } from "./errors.js";
import { WorkflowsRepository } from "./modules/workflows/workflows.repository.js";
import { workflowsRoutes } from "./modules/workflows/workflows.routes.js";

export type AppDeps = { config: Config; db: Pool };
export function buildApp({ config, db }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: true,
    requestIdHeader: "x-request-id",
    bodyLimit: 256 * 1024,
  });
  registerErrorHandling(app);
  workflowsRoutes(app, new WorkflowsRepository(db));
  app.get("/health", async (_request, reply) => {
    try {
      await db.query("SELECT 1");
      return { status: "ok", service: "workflow", db: "ok" };
    } catch (error) {
      app.log.warn(error, "health check: database unreachable");
      return reply
        .code(503)
        .send({ status: "degraded", service: "workflow", db: "unreachable" });
    }
  });
  return app;
}
