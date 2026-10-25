import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ada, login, register, setupTestApp } from "./helpers.js";

const ctx = await setupTestApp({ LOGIN_RATE_LIMIT: "3", REGISTER_RATE_LIMIT: "2" });
beforeEach(() => ctx.reset());
afterAll(() => ctx.close());

describe("rate limiting", () => {
  it("blocks login after too many attempts for the same IP and email", async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await login(ctx.app, { email: ada.email, password: "wrong-password1" });
      expect(response.statusCode).toBe(401);
    }

    const blocked = await login(ctx.app, { email: ada.email, password: "wrong-password1" });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe("RATE_LIMITED");
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);

    // A different account from the same IP is counted separately.
    const other = await login(ctx.app, { email: "grace@example.com", password: "wrong-password1" });
    expect(other.statusCode).toBe(401);
  });

  it("limits sign-ups per IP", async () => {
    expect((await register(ctx.app, { ...ada, email: "a@example.com" })).statusCode).toBe(201);
    expect((await register(ctx.app, { ...ada, email: "b@example.com" })).statusCode).toBe(201);
    expect((await register(ctx.app, { ...ada, email: "c@example.com" })).statusCode).toBe(429);
  });
});
