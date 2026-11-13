import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Config } from "../../config.js";
import { forbidden, notFound, unauthenticated } from "../../errors.js";
import {
  associateAgentSchema,
  connectionTestSchema,
  toolInputSchema,
  toolPatchSchema,
} from "./tools.schemas.js";
import { toolDefinitions, ToolsRepository } from "./tools.repository.js";

const ids = z.object({ id: z.uuid() });
const userIdSchema = z.uuid();

export function toolsRoutes(
  app: FastifyInstance,
  repository: ToolsRepository,
  config: Config,
) {
  app.addHook("preHandler", async (request) => {
    if (request.url === "/health" || request.url.startsWith("/internal/")) return;
    const value = request.headers["x-user-id"];
    const user = Array.isArray(value) ? value[0] : value;
    const parsed = userIdSchema.safeParse(user);
    if (!parsed.success) throw unauthenticated();
    request.headers["x-user-id"] = parsed.data;
  });

  app.get("/tools/definitions", async () => toolDefinitions);
  app.get("/tools", async (request) =>
    repository.list(String(request.headers["x-user-id"])),
  );
  app.post("/tools", async (request, reply) => {
    const body = toolInputSchema.parse(request.body);
    const tool = await repository.create(
      String(request.headers["x-user-id"]),
      body,
    );
    if (!tool) throw notFound("Tool definition");
    return reply.code(201).send(tool);
  });
  app.get("/tools/:id", async (request) => {
    const { id } = ids.parse(request.params);
    const tool = await repository.find(
      String(request.headers["x-user-id"]),
      id,
    );
    if (!tool) throw await inaccessible(repository, id);
    return tool;
  });
  app.patch("/tools/:id", async (request) => {
    const { id } = ids.parse(request.params);
    await assertOwned(repository, id, String(request.headers["x-user-id"]));
    return repository.update(
      String(request.headers["x-user-id"]),
      id,
      toolPatchSchema.parse(request.body),
    );
  });
  app.delete("/tools/:id", async (request, reply) => {
    const { id } = ids.parse(request.params);
    await assertOwned(repository, id, String(request.headers["x-user-id"]));
    await repository.remove(String(request.headers["x-user-id"]), id);
    return reply.code(204).send();
  });
  app.post("/tools/:id/test", async (request) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    await assertOwned(repository, id, user);
    const result = await repository.setConnectionStatus(
      user,
      id,
      connectionTestSchema.parse(request.body).status,
      connectionTestSchema.parse(request.body).error,
    );
    return result;
  });
  app.get("/tools/:id/agents", async (request) => {
    const { id } = ids.parse(request.params);
    await assertOwned(repository, id, String(request.headers["x-user-id"]));
    return repository.associations(String(request.headers["x-user-id"]), id);
  });
  app.post("/tools/:id/agents", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    await assertOwned(repository, id, user);
    const association = associateAgentSchema.parse(request.body);
    if (
      !(await agentOwnedBy(config.AGENT_SERVICE_URL, association.agentId, user))
    )
      throw forbidden();
    await repository.associate(
      user,
      id,
      association.agentId,
      association.config,
    );
    return reply.code(201).send(association);
  });
  app.delete("/tools/:id/agents/:agentId", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const { agentId } = z.object({ agentId: z.uuid() }).parse(request.params);
    const user = String(request.headers["x-user-id"]);
    await assertOwned(repository, id, user);
    if (!(await repository.unassociate(user, id, agentId)))
      throw notFound("Tool association");
    return reply.code(204).send();
  });
}

async function assertOwned(
  repository: ToolsRepository,
  id: string,
  user: string,
) {
  const owner = await repository.findOwner(id);
  if (!owner) throw notFound("Tool");
  if (owner !== user) throw forbidden();
}
async function inaccessible(repository: ToolsRepository, id: string) {
  if (await repository.findOwner(id)) throw forbidden();
  return notFound("Tool");
}
async function agentOwnedBy(agentUrl: string, agentId: string, userId: string) {
  const response = await fetch(
    `${agentUrl.replace(/\/$/, "")}/internal/agents/${agentId}/owner`,
  );
  if (response.status === 404) return false;
  if (!response.ok)
    throw new Error(`Agent ownership service returned ${response.status}`);
  return ((await response.json()) as { userId: string }).userId === userId;
}
