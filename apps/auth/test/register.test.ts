import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hashSessionToken } from "../src/lib/tokens.js";
import { ada, register, sessionCookie, setupTestApp } from "./helpers.js";

const ctx = await setupTestApp();
beforeEach(() => ctx.reset());
afterAll(() => ctx.close());

describe("POST /auth/register", () => {
  it("creates the user, signs them in, and never returns the password hash", async () => {
    const response = await register(ctx.app);

    expect(response.statusCode).toBe(201);
    const { user } = response.json();
    expect(user).toEqual({
      id: expect.any(String),
      email: "ada@example.com",
      name: "Ada Lovelace",
      createdAt: expect.any(String),
    });
    expect(response.body).not.toMatch(/hash|password/i);

    const cookie = sessionCookie(response);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
    expect(cookie?.maxAge).toBeGreaterThan(29 * 24 * 60 * 60);
  });

  it("stores an Argon2id hash and only the SHA-256 of the session token", async () => {
    const token = sessionCookie(await register(ctx.app))!.value;

    const { rows: users } = await ctx.db.query("SELECT password_hash FROM users");
    expect(users[0].password_hash).toMatch(/^\$argon2id\$/);
    expect(users[0].password_hash).not.toContain(ada.password);

    const { rows: sessions } = await ctx.db.query("SELECT token_hash FROM sessions");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].token_hash.equals(hashSessionToken(token))).toBe(true);
  });

  it("rejects a duplicate email regardless of case or whitespace", async () => {
    await register(ctx.app);
    const response = await register(ctx.app, { ...ada, email: "  ADA@example.com " });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toMatchObject({
      code: "EMAIL_TAKEN",
      details: [{ field: "email", message: expect.any(String) }],
    });
    expect(sessionCookie(response)).toBeUndefined();
  });

  it("lets exactly one of two simultaneous sign-ups win", async () => {
    const results = await Promise.all([register(ctx.app), register(ctx.app)]);

    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    const { rows } = await ctx.db.query("SELECT count(*)::int AS n FROM users");
    expect(rows[0].n).toBe(1);
  });

  it("returns every field error at once", async () => {
    const response = await register(ctx.app, { name: "A", email: "nope", password: "short" });

    expect(response.statusCode).toBe(400);
    const { error } = response.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(["name", "email", "password"]),
    );
  });

  it("rejects non-JSON and oversized bodies with the standard envelope", async () => {
    const xml = await ctx.app.inject({
      method: "POST",
      url: "/auth/register",
      headers: { "content-type": "application/xml" },
      payload: "<user/>",
    });
    expect(xml.statusCode).toBe(415);
    expect(xml.json().error.code).toBe("UNSUPPORTED_MEDIA_TYPE");

    const huge = await register(ctx.app, { ...ada, name: "x".repeat(20_000) });
    expect(huge.statusCode).toBe(413);
    expect(huge.json().error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("GET /health", () => {
  it("reports the database as reachable", async () => {
    const response = await ctx.app.inject({ method: "GET", url: "/health" });
    expect(response.json()).toEqual({ status: "ok", service: "auth", db: "ok" });
  });
});
