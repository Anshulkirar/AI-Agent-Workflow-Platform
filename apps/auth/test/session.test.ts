import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { generateSessionToken } from "../src/lib/tokens.js";
import { deleteStaleSessions } from "../src/modules/sessions/sessions.repository.js";
import { registerAndGetToken, sessionCookie, setupTestApp, withSession } from "./helpers.js";

const ctx = await setupTestApp();
beforeEach(() => ctx.reset());
afterAll(() => ctx.close());

const me = (cookies: Record<string, string> = {}) =>
  ctx.app.inject({ method: "GET", url: "/auth/me", cookies });
const logout = (cookies: Record<string, string> = {}) =>
  ctx.app.inject({ method: "POST", url: "/auth/logout", cookies });

describe("GET /auth/me", () => {
  it("returns the signed-in user and session expiry", async () => {
    const token = await registerAndGetToken(ctx.app);
    const response = await me(withSession(token));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: { email: "ada@example.com" },
      session: { expiresAt: expect.any(String) },
    });
  });

  it("rejects a missing, malformed or unknown token", async () => {
    for (const cookies of [{}, withSession("garbage"), withSession(generateSessionToken())]) {
      const response = await me(cookies);
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects an expired session and tells the browser to drop the cookie", async () => {
    const token = await registerAndGetToken(ctx.app);
    await ctx.db.query(
      "UPDATE sessions SET created_at = now() - interval '31 days', expires_at = now() - interval '1 second'",
    );

    const response = await me(withSession(token));
    expect(response.statusCode).toBe(401);
    expect(sessionCookie(response)?.maxAge).toBe(0);
  });
});

describe("POST /auth/logout", () => {
  it("revokes the session server-side and clears the cookie", async () => {
    const token = await registerAndGetToken(ctx.app);

    const response = await logout(withSession(token));
    expect(response.statusCode).toBe(204);
    expect(sessionCookie(response)?.maxAge).toBe(0);

    // Even if the browser kept the cookie, it no longer works.
    expect((await me(withSession(token))).statusCode).toBe(401);
    const { rows } = await ctx.db.query("SELECT revoked_at FROM sessions");
    expect(rows[0].revoked_at).toBeInstanceOf(Date);
  });

  it("is idempotent", async () => {
    expect((await logout()).statusCode).toBe(204);
    expect((await logout(withSession("garbage"))).statusCode).toBe(204);
  });
});

describe("POST /internal/sessions/verify", () => {
  const verify = (payload: object) =>
    ctx.app.inject({ method: "POST", url: "/internal/sessions/verify", payload });

  it("resolves a valid token to the user and session ids", async () => {
    const token = await registerAndGetToken(ctx.app);
    const response = await verify({ token });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: expect.any(String), sessionId: expect.any(String) });
  });

  it("rejects an invalid token or a bad body", async () => {
    expect((await verify({ token: generateSessionToken() })).statusCode).toBe(401);
    expect((await verify({})).statusCode).toBe(400);
  });
});

describe("stale session cleanup", () => {
  it("deletes sessions that ended more than the retention period ago, and keeps the rest", async () => {
    await registerAndGetToken(ctx.app); // one active session
    await ctx.db.query(
      `INSERT INTO sessions (user_id, token_hash, created_at, expires_at, revoked_at)
       SELECT id, sha256('old'::bytea), now() - interval '20 days', now() - interval '10 days', NULL FROM users`,
    );

    expect(await deleteStaleSessions(ctx.db, 7)).toBe(1);
    const { rows } = await ctx.db.query("SELECT count(*)::int AS n FROM sessions");
    expect(rows[0].n).toBe(1);
  });
});
