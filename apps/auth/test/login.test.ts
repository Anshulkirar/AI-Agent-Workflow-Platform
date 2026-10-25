import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hashSessionToken } from "../src/lib/tokens.js";
import { ada, login, register, sessionCookie, setupTestApp, withSession } from "./helpers.js";

const ctx = await setupTestApp();
beforeEach(async () => {
  await ctx.reset();
  await register(ctx.app);
});
afterAll(() => ctx.close());

describe("POST /auth/login", () => {
  it("signs in with the right password, ignoring email case", async () => {
    const response = await login(ctx.app, { email: "ADA@Example.com", password: ada.password });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe("ada@example.com");
    expect(sessionCookie(response)).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  });

  it("gives an unknown email and a wrong password the exact same response", async () => {
    const wrongPassword = await login(ctx.app, { email: ada.email, password: "wrong-password1" });
    const unknownEmail = await login(ctx.app, { email: "nobody@example.com", password: "wrong-password1" });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(unknownEmail.body).toBe(wrongPassword.body);
    expect(wrongPassword.json().error.code).toBe("INVALID_CREDENTIALS");
    expect(sessionCookie(wrongPassword)).toBeUndefined();
  });

  it("issues a browser-session cookie and a short server expiry when remember is false", async () => {
    const response = await login(ctx.app, { email: ada.email, password: ada.password, remember: false });
    const cookie = sessionCookie(response)!;

    expect(cookie.maxAge).toBeUndefined();
    const { rows } = await ctx.db.query(
      "SELECT expires_at - created_at AS lifetime FROM sessions WHERE token_hash = $1",
      [hashSessionToken(cookie.value)],
    );
    expect(rows[0].lifetime.hours).toBe(12);
  });

  it("revokes the session the browser already had", async () => {
    const first = await login(ctx.app, { email: ada.email, password: ada.password });
    const oldToken = sessionCookie(first)!.value;

    const response = await login(ctx.app, { email: ada.email, password: ada.password }, withSession(oldToken));
    expect(sessionCookie(response)!.value).not.toBe(oldToken);

    const me = await ctx.app.inject({ method: "GET", url: "/auth/me", cookies: withSession(oldToken) });
    expect(me.statusCode).toBe(401);
  });
});
