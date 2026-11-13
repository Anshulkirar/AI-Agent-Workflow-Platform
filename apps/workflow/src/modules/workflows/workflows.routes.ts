import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { forbidden, notFound, unauthenticated } from "../../errors.js";
import {
  createVersionSchema,
  workflowInputSchema,
  workflowPatchSchema,
  workflowUpdateSchema,
} from "./workflows.schemas.js";
import { WorkflowsRepository } from "./workflows.repository.js";

const idSchema = z.uuid();
const userIdSchema = z.uuid();

export function workflowsRoutes(
  app: FastifyInstance,
  repository: WorkflowsRepository,
) {
  app.addHook("preHandler", async (request) => {
    if (request.url === "/health" || request.url.startsWith("/internal/")) return;
    const raw = request.headers["x-user-id"];
    const userId = Array.isArray(raw) ? raw[0] : raw;
    const parsed = userIdSchema.safeParse(userId);
    if (!parsed.success) throw unauthenticated();
    request.headers["x-user-id"] = parsed.data;
  });

  app.post("/workflows", async (request, reply) => {
    const workflow = await repository.create(
      String(request.headers["x-user-id"]),
      workflowInputSchema.parse(request.body) as never,
    );
    return reply.code(201).send(workflow);
  });

  app.get("/workflows", async (request) =>
    repository.list(String(request.headers["x-user-id"])),
  );
  app.get("/workflows/:id", async (request, reply) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const workflow = await repository.find(
      String(request.headers["x-user-id"]),
      id,
    );
    if (!workflow) {
      if (await repository.findOwner(id)) throw forbidden();
      throw notFound("Workflow");
    }
    return workflow;
  });
  app.put("/workflows/:id", async (request, reply) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    if (!(await repository.findOwner(id))) throw notFound("Workflow");
    if ((await repository.findOwner(id)) !== userId) throw forbidden();
    return repository.update(
      userId,
      id,
      workflowUpdateSchema.parse(request.body),
    );
  });
  app.patch("/workflows/:id", async (request, reply) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    if (!(await repository.findOwner(id))) throw notFound("Workflow");
    if ((await repository.findOwner(id)) !== userId) throw forbidden();
    const workflow = await repository.update(
      userId,
      id,
      workflowPatchSchema.parse(request.body),
    );
    return (
      workflow ??
      reply
        .code(404)
        .send({ error: { code: "NOT_FOUND", message: "Workflow not found." } })
    );
  });
  app.delete("/workflows/:id", async (request, reply) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    if (!(await repository.findOwner(id))) throw notFound("Workflow");
    if ((await repository.findOwner(id)) !== userId) throw forbidden();
    await repository.remove(userId, id);
    return reply.code(204).send();
  });

  app.get("/workflows/:id/versions", async (request) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    if (!(await repository.findOwner(id))) throw notFound("Workflow");
    if ((await repository.findOwner(id)) !== userId) throw forbidden();
    return repository.versions(userId, id);
  });
  app.post("/workflows/:id/versions", async (request, reply) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    if (!(await repository.findOwner(id))) throw notFound("Workflow");
    if ((await repository.findOwner(id)) !== userId) throw forbidden();
    const body = createVersionSchema.parse(request.body);
    const workflow = await repository.find(userId, id);
    const version = await repository.createVersion(
      userId,
      id,
      body.graph,
      body.settings ?? workflow?.settings,
      body.changelog,
    );
    return reply.code(201).send({
      workflowId: id,
      version,
      graph: body.graph,
      settings: body.settings ?? workflow?.settings,
      changelog: body.changelog ?? null,
    });
  });
  app.get("/workflows/:id/versions/:version", async (request) => {
    const { id, version } = z
      .object({ id: idSchema, version: z.coerce.number().int().positive() })
      .parse(request.params);
    const userId = String(request.headers["x-user-id"]);
    const found = await repository.version(userId, id, version);
    if (!found) throw notFound("Workflow version");
    return found;
  });
  app.post(
    "/workflows/:id/versions/:version/activate",
    async (request, reply) => {
      const { id, version } = z
        .object({ id: idSchema, version: z.coerce.number().int().positive() })
        .parse(request.params);
      const userId = String(request.headers["x-user-id"]);
      if (!(await repository.findOwner(id))) throw notFound("Workflow");
      if ((await repository.findOwner(id)) !== userId) throw forbidden();
      if (!(await repository.activateVersion(userId, id, version)))
        throw notFound("Workflow version");
      return reply.send(await repository.find(userId, id));
    },
  );

  app.get("/internal/workflows/:id", async (request, reply) => {
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const workflow = await repository.findOwner(id);
    if (!workflow) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Workflow not found." } });
    const row = await repository.find(String(workflow), id);
    if (!row) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Workflow not found." } });
    return { id, userId: workflow, name: row.name, graph: row.graph, settings: row.settings };
  });
}
