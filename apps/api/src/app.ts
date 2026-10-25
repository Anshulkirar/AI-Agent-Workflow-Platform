import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "./config.js";
import { registerErrorHandling } from "./errors.js";
import { registerAuthProxy } from "./plugins/auth-proxy.js";
import { registerOriginCheck } from "./plugins/origin-check.js";
import { registerRequireSession } from "./plugins/require-session.js";

export type AppDeps = { config: Config };

/**
 * The public entry point. It owns no data: it checks where requests come from, works out who is
 * calling, and forwards each path prefix to the service that owns it.
 */
export function buildApp({ config }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: config.TRUST_PROXY,
  });

  registerErrorHandling(app);
  app.register(cookie);
  registerOriginCheck(app, config.WEB_ORIGINS);
  registerRequireSession(app, config.AUTH_SERVICE_URL);

  app.get("/", async (_request, reply) => reply.type("text/plain").send("API Server is running!"));
  app.get("/health", async () => ({ status: "ok" }));

  registerAuthProxy(app, config.AUTH_SERVICE_URL);
  // Future services: app.register(proxy, { prefix: "/v1/agents", preHandler: app.requireSession,
  //   replyOptions: { rewriteRequestHeaders: withIdentityHeaders }, ... })

  return app;
}
