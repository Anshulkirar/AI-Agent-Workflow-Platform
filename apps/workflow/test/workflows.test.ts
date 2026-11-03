import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import type { Pool } from "@agentflow/db";
import { graph, headers, setupTestApp, workflow } from "./helpers.js";

let app: FastifyInstance;
let db: Pool;
let reset: () => Promise<unknown>;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ app, db, reset, close } = await setupTestApp());
});
beforeEach(async () => {
  await reset();
});
afterAll(async () => close());
const create = (
  body = workflow,
  userId = "11111111-1111-4111-8111-111111111111",
) =>
  app.inject({
    method: "POST",
    url: "/workflows",
    headers: headers(userId),
    payload: body,
  });

describe("workflow CRUD", () => {
  it("creates and lists an owned workflow", async () => {
    const created = await create();
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const list = await app.inject({ url: "/workflows", headers: headers() });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].id).toBe(id);
  });
  it("returns no workflow when another user lists workflows", async () => {
    await create();
    const response = await app.inject({
      url: "/workflows",
      headers: headers("22222222-2222-4222-8222-222222222222"),
    });
    expect(response.json()).toEqual([]);
  });
  it("updates and creates a new immutable version", async () => {
    const id = (await create()).json().id;
    const response = await app.inject({
      method: "POST",
      url: `/workflows/${id}/versions`,
      headers: headers(),
      payload: { graph, changelog: "Changed graph" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().version).toBe(2);
    const versions = await app.inject({
      url: `/workflows/${id}/versions`,
      headers: headers(),
    });
    expect(versions.json()).toHaveLength(2);
  });
  it("prevents ownership access and requires identity", async () => {
    const id = (await create()).json().id;
    const denied = await app.inject({
      url: `/workflows/${id}`,
      headers: headers("22222222-2222-4222-8222-222222222222"),
    });
    expect(denied.statusCode).toBe(403);
    const missing = await app.inject({ url: `/workflows/${id}` });
    expect(missing.statusCode).toBe(401);
  });
  it("rejects invalid graphs and triggers", async () => {
    const invalid = await create({
      ...workflow,
      trigger: { type: "schedule" },
    });
    expect(invalid.statusCode).toBe(400);
    const badGraph = await create({
      ...workflow,
      graph: {
        nodes: [
          {
            id: "n",
            position: { x: 0, y: 0 },
            data: { kind: "llm", label: "LLM", config: {} },
          },
        ],
        edges: [],
      },
    });
    expect(badGraph.statusCode).toBe(400);
  });
  it("deletes only owned workflows", async () => {
    const id = (await create()).json().id;
    const deleted = await app.inject({
      method: "DELETE",
      url: `/workflows/${id}`,
      headers: headers(),
    });
    expect(deleted.statusCode).toBe(204);
    expect(
      (await app.inject({ url: `/workflows/${id}`, headers: headers() }))
        .statusCode,
    ).toBe(404);
  });
});
