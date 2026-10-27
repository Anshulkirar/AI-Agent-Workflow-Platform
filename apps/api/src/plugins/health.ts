import type { FastifyInstance } from "fastify";
import type { ServiceRoute } from "../services.js";

type ServiceStatus = "ok" | "unhealthy" | "unreachable";

async function checkService(service: ServiceRoute): Promise<ServiceStatus> {
  try {
    const response = await fetch(new URL("/health", service.upstream), { signal: AbortSignal.timeout(2_000) });
    return response.ok ? "ok" : "unhealthy";
  } catch {
    return "unreachable";
  }
}

// Probes run every few seconds: skip the rate limit, and log only problems.
const probe = { config: { rateLimit: false }, logLevel: "warn" } as const;

export function registerHealthRoutes(app: FastifyInstance, services: ServiceRoute[]) {
  app.get("/", probe, async (_request, reply) => reply.type("text/plain").send("API Server is running!"));

  /** Liveness: the gateway process is up. Used by Docker's healthcheck; never depends on other services. */
  app.get("/health", probe, async () => ({ status: "ok" }));

  /** Readiness: every service behind the gateway answers its own /health. */
  app.get("/ready", probe, async (_request, reply) => {
    const results = await Promise.all(
      services.map(async (service) => [service.name, await checkService(service)] as const),
    );
    const ready = results.every(([, status]) => status === "ok");
    return reply
      .code(ready ? 200 : 503)
      .send({ status: ready ? "ok" : "degraded", services: Object.fromEntries(results) });
  });
}
