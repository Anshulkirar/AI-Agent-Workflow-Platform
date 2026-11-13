import type { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import { z } from "zod";
import type { Config } from "../../config.js";
import {
  conflict,
  forbidden,
  notFound,
  unauthenticated,
} from "../../errors.js";
import { RunsRepository } from "./runs.repository.js";
import { createRunSchema, logSchema, retrySchema } from "./runs.schemas.js";

const ids = z.object({ id: z.uuid() });
const userIdSchema = z.uuid();
const queueKey = "agentflow:execution:queue";

export function runsRoutes(
  app: FastifyInstance,
  repository: RunsRepository,
  redis: Redis,
  config: Config,
) {
  app.addHook("preHandler", async (request) => {
    if (request.url === "/health" || request.url.startsWith("/internal/")) return;
    const value = request.headers["x-user-id"];
    const userId = Array.isArray(value) ? value[0] : value;
    const parsed = userIdSchema.safeParse(userId);
    if (!parsed.success) throw unauthenticated();
    request.headers["x-user-id"] = parsed.data;
  });

  app.post("/runs", async (request, reply) => {
    const userId = String(request.headers["x-user-id"]);
    const body = createRunSchema.parse(request.body);
    const rerunOf = body.rerunOf ?? undefined;
    if (rerunOf) {
      const rerun = await repository.find(userId, rerunOf);
      if (!rerun) throw notFound("Run");
    }

    const ownershipUrl = sourceOwnerUrl(config, body.sourceType, body.sourceId);
    const ownership = await fetchOwnership(ownershipUrl);
    if (!ownership)
      throw notFound(body.sourceType === "agent" ? "Agent" : "Workflow");
    if (ownership.userId !== userId) throw forbidden();

    const run = await repository.create(userId, {
      ...body,
      sourceName: ownership.name ?? body.sourceType,
      rerunOf,
    });
    await redis.rpush(queueKey, run.id);
    return reply.code(201).send(run);
  });

  app.get("/runs", async (request) =>
    repository.list(String(request.headers["x-user-id"])),
  );

  app.get("/runs/:id/nodes", async (request) => {
    const { id } = ids.parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    if (!(await repository.find(userId, id))) throw await inaccessibleRun(repository, id);
    return repository.nodeRuns(id);
  });

  app.get("/runs/:id", async (request) => {
    const { id } = ids.parse(request.params);
    const run = await repository.find(String(request.headers["x-user-id"]), id);
    if (!run) throw await inaccessibleRun(repository, id);
    return run;
  });

  app.post("/runs/:id/cancel", async (request) => {
    const { id } = ids.parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    const existing = await repository.find(userId, id);
    if (!existing) throw await inaccessibleRun(repository, id);
    if (!["queued", "running"].includes(existing.status)) {
      throw conflict("Only queued or running runs can be cancelled.");
    }
    return (await repository.cancel(userId, id))!;
  });

  app.post("/runs/:id/retry", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    const retry = retrySchema.parse(request.body);
    const original = await repository.find(userId, id);
    if (!original) throw await inaccessibleRun(repository, id);
    if (!["failed", "cancelled", "completed"].includes(original.status)) {
      throw conflict("Only finished runs can be retried.");
    }

    const rerun = await repository.create(userId, {
      sourceType: original.source.type,
      sourceId: original.source.id,
      sourceName: original.source.name,
      trigger: "rerun",
      input: original.input,
      timeoutMs: retry.timeoutMs ?? original.timeoutMs,
      maxAttempts: retry.maxAttempts ?? original.maxAttempts,
      rerunOf: id,
    });
    await redis.rpush(queueKey, rerun.id);
    return reply.code(201).send(rerun);
  });

  app.post("/runs/:id/logs", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    if (!(await repository.find(userId, id)))
      throw await inaccessibleRun(repository, id);
    const body = logSchema.parse(request.body);
    const atMs = await repository.addLog(
      id,
      body.level,
      body.message,
      body.stepId,
    );
    return reply.code(201).send({ runId: id, atMs, ...body });
  });

  app.get("/runs/:id/logs", async (request) => {
    const { id } = ids.parse(request.params);
    if (!(await repository.find(String(request.headers["x-user-id"]), id))) {
      throw await inaccessibleRun(repository, id);
    }
    return repository.logs(id);
  });
}

async function inaccessibleRun(repository: RunsRepository, id: string) {
  const owner = await repository.findOwner(id);
  if (owner) throw forbidden();
  return notFound("Run");
}

function sourceOwnerUrl(
  config: Config,
  sourceType: "agent" | "workflow",
  sourceId: string,
) {
  const base =
    sourceType === "agent"
      ? config.AGENT_SERVICE_URL
      : config.WORKFLOW_SERVICE_URL;
  return `${base.replace(/\/$/, "")}/internal/${sourceType === "agent" ? "agents" : "workflows"}/${sourceId}/owner`;
}

async function fetchOwnership(url: string) {
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Ownership service returned ${response.status}`);
  return (await response.json()) as { userId: string; name?: string };
}
