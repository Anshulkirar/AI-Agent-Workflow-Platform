import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Config } from "../../config.js";
import { forbidden, notFound, unauthenticated } from "../../errors.js";
import { sourcePatchSchema, textSourceSchema, urlSourceSchema } from "./sources.schemas.js";
import { SourcesRepository } from "./sources.repository.js";

const ids = z.object({ id: z.uuid() });
const userIdSchema = z.uuid();
const allowedKinds = new Set(["pdf", "docx", "txt", "md", "csv", "xlsx", "json", "html"]);

export function sourcesRoutes(app: FastifyInstance, repository: SourcesRepository, config: Config, redisQueue: (id: string) => Promise<void>) {
  app.addHook("preHandler", async (request) => {
    if (request.url === "/health" || request.url.startsWith("/internal/")) return;
    const value = request.headers["x-user-id"];
    const user = Array.isArray(value) ? value[0] : value;
    const parsed = userIdSchema.safeParse(user);
    if (!parsed.success) throw unauthenticated();
    request.headers["x-user-id"] = parsed.data;
  });
  app.get("/knowledge", async (request) => repository.list(String(request.headers["x-user-id"])));
  app.post("/knowledge/search", async (request) => {
    const body = z.object({ query: z.string().trim().min(1).max(10_000), limit: z.coerce.number().int().min(1).max(50).default(5) }).parse(request.body);
    const results = await repository.search(String(request.headers["x-user-id"]), embed(body.query), body.limit);
    return { query: body.query, results };
  });
  app.post("/knowledge", async (request, reply) => {
    const raw = textSourceSchema.safeParse(request.body);
    const body = raw.success ? raw.data : urlSourceSchema.parse(request.body);
    const source = await repository.create(String(request.headers["x-user-id"]), {
      name: body.name, type: body.type, collectionId: body.collectionId, tags: body.tags,
      url: body.type === "url" ? body.url : undefined,
      textContent: body.type === "text" ? body.text : undefined,
    });
    await redisQueue(source.id);
    return reply.code(201).send(source);
  });
  app.post("/knowledge/upload", async (request, reply) => {
    const parts = request.parts();
    let fields: Record<string, string> = {};
    const fileParts: { filename: string; data: Buffer }[] = [];
    for await (const part of parts) {
      if (part.type === "file") {
        const data = await part.toBuffer();
        if (data.length > config.KNOWLEDGE_MAX_FILE_BYTES) throw Object.assign(new Error("File exceeds the 25 MB limit."), { statusCode: 413 });
        fileParts.push({ filename: part.filename, data });
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }
    if (fileParts.length !== 1) throw new Error("Exactly one file is required.");
    const file = fileParts[0]!;
    const extension = path.extname(file.filename).slice(1).toLowerCase();
    if (!allowedKinds.has(extension)) throw Object.assign(new Error("Unsupported file type."), { statusCode: 415 });
    await mkdir(config.KNOWLEDGE_STORAGE_DIR, { recursive: true, mode: 0o700 });
    const storagePath = path.join(config.KNOWLEDGE_STORAGE_DIR, `${crypto.randomUUID()}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    await writeFile(storagePath, file.data, { flag: "wx", mode: 0o600 });
    const source = await repository.create(String(request.headers["x-user-id"]), {
      name: fields.name?.trim() || file.filename,
      type: "file",
      collectionId: fields.collectionId?.trim() || "general",
      tags: fields.tags ? fields.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      fileKind: extension,
      storagePath,
      sizeBytes: file.data.length,
    });
    await redisQueue(source.id);
    return reply.code(201).send(source);
  });
  app.get("/knowledge/:id", async (request) => {
    const { id } = ids.parse(request.params);
    return sourceForRequest(repository, id, String(request.headers["x-user-id"]), true);
  });
  app.patch("/knowledge/:id", async (request) => {
    const { id } = ids.parse(request.params);
    await assertOwned(repository, id, String(request.headers["x-user-id"]));
    return repository.update(String(request.headers["x-user-id"]), id, sourcePatchSchema.parse(request.body));
  });
  app.delete("/knowledge/:id", async (request, reply) => {
    const { id } = ids.parse(request.params);
    await assertOwned(repository, id, String(request.headers["x-user-id"]));
    await repository.remove(String(request.headers["x-user-id"]), id);
    return reply.code(204).send();
  });
  app.post("/knowledge/:id/retry", async (request) => {
    const { id } = ids.parse(request.params);
    await assertOwned(repository, id, String(request.headers["x-user-id"]));
    await repository.retry(id);
    await redisQueue(id);
    return repository.find(String(request.headers["x-user-id"]), id);
  });
  app.post("/knowledge/:id/agents", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const user = String(request.headers["x-user-id"]);
    await assertOwned(repository, id, user);
    const { agentId } = z.object({ agentId: z.uuid() }).parse(request.body);
    await repository.associate(user, id, agentId);
    return reply.code(201).send({ agentId });
  });
  app.delete("/knowledge/:id/agents/:agentId", async (request, reply) => {
    const { id } = ids.parse(request.params);
    const { agentId } = z.object({ agentId: z.uuid() }).parse(request.params);
    if (!(await repository.unassociate(String(request.headers["x-user-id"]), id, agentId))) throw notFound("Knowledge association");
    return reply.code(204).send();
  });
}

async function sourceForRequest(repository: SourcesRepository, id: string, user: string, withNotFound: boolean) {
  const source = await repository.find(user, id);
  if (source) return source;
  if (await repository.owner(id)) throw forbidden();
  if (withNotFound) throw notFound();
  return null;
}
async function assertOwned(repository: SourcesRepository, id: string, user: string) {
  const owner = await repository.owner(id);
  if (!owner) throw notFound();
  if (owner !== user) throw forbidden();
}

function embed(text: string) {
  const vector = new Array<number>(64).fill(0);
  for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let hash = 0;
    for (let index = 0; index < token.length; index++) hash = ((hash << 5) - hash + token.charCodeAt(index)) | 0;
    const bucket = ((hash % 64) + 64) % 64;
    vector[bucket] = (vector[bucket] ?? 0) + 1;
  }
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return length ? vector.map((value) => value / length) : vector;
}
