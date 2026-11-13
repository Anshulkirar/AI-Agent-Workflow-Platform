import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { forbidden, notFound, unauthenticated } from "../../errors.js";
import {
  agentInputSchema,
  agentPatchSchema,
  createVersionSchema,
} from "./agents.schemas.js";
import { AgentsRepository } from "./agents.repository.js";
const ids = z.object({ id: z.uuid() });
const userSchema = z.uuid();
export function agentsRoutes(
  app: FastifyInstance,
  repository: AgentsRepository,
) {
  app.addHook("preHandler", async (request) => {
    if (request.url === "/health" || request.url.startsWith("/internal/")) return;
    const value = request.headers["x-user-id"];
    const user = Array.isArray(value) ? value[0] : value;
    const parsed = userSchema.safeParse(user);
    if (!parsed.success) throw unauthenticated();
    request.headers["x-user-id"] = parsed.data;
  });
  app.post("/agents", async (request, reply) =>
    reply
      .code(201)
      .send(
        await repository.create(
          String(request.headers["x-user-id"]),
          agentInputSchema.parse(request.body) as never,
        ),
      ),
  );
  app.get("/agents", async (request) =>
    repository.list(String(request.headers["x-user-id"])),
  );
  app.get("/agents/:id", async (request) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    const agent = await repository.find(user, id);
    if (agent) return agent;
    if (await repository.findOwner(id)) throw forbidden();
    throw notFound("Agent");
  });
  app.put("/agents/:id", async (request) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    const owner = await repository.findOwner(id);
    if (!owner) throw notFound("Agent");
    if (owner !== user) throw forbidden();
    return repository.update(
      user,
      id,
      agentInputSchema.parse(request.body) as never,
    );
  });
  app.patch("/agents/:id", async (request) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    const owner = await repository.findOwner(id);
    if (!owner) throw notFound("Agent");
    if (owner !== user) throw forbidden();
    return repository.update(
      user,
      id,
      agentPatchSchema.parse(request.body) as never,
    );
  });
  app.delete("/agents/:id", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    const owner = await repository.findOwner(id);
    if (!owner) throw notFound("Agent");
    if (owner !== user) throw forbidden();
    await repository.remove(user, id);
    return reply.code(204).send();
  });
  app.get("/agents/:id/versions", async (request) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    await assertOwned(repository, id, user);
    return repository.versions(user, id);
  });
  app.post("/agents/:id/versions", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    await assertOwned(repository, id, user);
    const body = createVersionSchema.parse(request.body);
    const version = await repository.createVersion(
      user,
      id,
      {
        instructions: body.instructions,
        tools: body.tools,
        knowledge: body.knowledge,
        settings: body.settings,
        workflow: body.workflow,
      },
      body.changelog,
    );
    return reply.code(201).send({ agentId: id, version, ...body });
  });
  app.get("/agents/:id/versions/:version", async (request) => {
    const { id, version } = z
      .object({ id: z.uuid(), version: z.coerce.number().int().positive() })
      .parse(request.params);
    const user = String(request.headers["x-user-id"]);
    const found = await repository.version(user, id, version);
    if (!found) throw notFound("Agent version");
    return found;
  });
  app.post("/agents/:id/versions/:version/activate", async (request, reply) => {
    const { id, version } = z
      .object({ id: z.uuid(), version: z.coerce.number().int().positive() })
      .parse(request.params);
    const user = String(request.headers["x-user-id"]);
    await assertOwned(repository, id, user);
    if (!(await repository.activateVersion(user, id, version)))
      throw notFound("Agent version");
    return repository.find(user, id);
  });
}
async function assertOwned(
  repository: AgentsRepository,
  id: string,
  user: string,
) {
  const owner = await repository.findOwner(id);
  if (!owner) throw notFound("Agent");
  if (owner !== user) throw forbidden();
}
