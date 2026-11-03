import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "@agentflow/db";
import { agent, headers, setupTestApp } from "./helpers.js";
let app: FastifyInstance;
let db: Pool;
let reset: () => Promise<unknown>;
let close: () => Promise<void>;
beforeAll(async () => ({ app, db, reset, close } = await setupTestApp()));
beforeEach(async () => reset());
afterAll(async () => close());
const create = (owner = "11111111-1111-4111-8111-111111111111") =>
  app.inject({
    method: "POST",
    url: "/agents",
    headers: headers(owner),
    payload: agent,
  });
describe("agent CRUD and ownership", () => {
  it("creates, lists and updates an agent", async () => {
    const created = await create();
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const updated = await app.inject({
      method: "PATCH",
      url: `/agents/${id}`,
      headers: headers(),
      payload: { status: "active", instructions: "Use a concise tone." },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().status).toBe("active");
    expect(updated.json().instructions).toBe("Use a concise tone.");
    expect(
      (await app.inject({ url: "/agents", headers: headers() })).json(),
    ).toHaveLength(1);
  });
  it("isolates owners and prevents cross-user updates", async () => {
    const id = (await create()).json().id;
    expect(
      (
        await app.inject({
          url: "/agents",
          headers: headers("22222222-2222-4222-8222-222222222222"),
        })
      ).json(),
    ).toEqual([]);
    expect(
      (
        await app.inject({
          url: `/agents/${id}`,
          headers: headers("22222222-2222-4222-8222-222222222222"),
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ url: `/agents/${id}`, headers: headers() }))
        .statusCode,
    ).toBe(200);
  });
  it("versions and activates configuration", async () => {
    const id = (await create()).json().id;
    const created = await app.inject({
      method: "POST",
      url: `/agents/${id}/versions`,
      headers: headers(),
      payload: {
        instructions: "New instructions",
        tools: ["tool-2"],
        knowledge: ["kb-2"],
        settings: agent.settings,
        changelog: "Second configuration",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().version).toBe(2);
    const list = await app.inject({
      url: `/agents/${id}/versions`,
      headers: headers(),
    });
    expect(list.json()).toHaveLength(2);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/agents/${id}/versions/1/activate`,
          headers: headers(),
        })
      ).statusCode,
    ).toBe(200);
  });
  it("requires an authenticated identity and deletes owned agents", async () => {
    expect((await app.inject({ url: "/agents" })).statusCode).toBe(401);
    const id = (await create()).json().id;
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/agents/${id}`,
          headers: headers(),
        })
      ).statusCode,
    ).toBe(204);
  });
});
