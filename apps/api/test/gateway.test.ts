import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

// A stand-in for the auth service that echoes what the gateway sent it.
let upstream: FastifyInstance;
let gateway: FastifyInstance;

function gatewayFor(authServiceUrl: string) {
  return buildApp({ config: loadConfig({ LOG_LEVEL: "silent", AUTH_SERVICE_URL: authServiceUrl }) });
}

beforeAll(async () => {
  upstream = Fastify();
  upstream.post("/auth/login", async (request, reply) =>
    reply
      .header("set-cookie", "af_session=abc; HttpOnly; Path=/")
      .send({ path: request.url, body: request.body, forwardedFor: request.headers["x-forwarded-for"] }),
  );
  upstream.post<{ Body: { token: string } }>("/internal/sessions/verify", async (request, reply) =>
    request.body.token === "good-token"
      ? { userId: "user-1", sessionId: "session-1" }
      : reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "no" } }),
  );
  const address = await upstream.listen({ port: 0, host: "127.0.0.1" });

  gateway = gatewayFor(address);
  // A protected route, like a future service would get.
  gateway.get("/v1/whoami", { preHandler: gateway.requireSession }, async (request) => ({
    identity: request.identity,
    clientSentUserId: request.headers["x-user-id"] ?? null,
  }));
  await gateway.ready();
});

afterAll(async () => {
  await gateway.close();
  await upstream.close();
});

describe("existing endpoints", () => {
  it("keeps / and /health", async () => {
    expect((await gateway.inject("/")).body).toBe("API Server is running!");
    expect((await gateway.inject("/health")).json()).toEqual({ status: "ok" });
  });
});

describe("auth proxy", () => {
  it("forwards /v1/auth/* to /auth/* and passes Set-Cookie back", async () => {
    const response = await gateway.inject({ method: "POST", url: "/v1/auth/login", payload: { email: "a@b.co" } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ path: "/auth/login", body: { email: "a@b.co" } });
    expect(response.headers["set-cookie"]).toContain("af_session=abc");
  });

  it("replaces a spoofed X-Forwarded-For with the client IP it actually saw", async () => {
    const response = await gateway.inject({
      method: "POST",
      url: "/v1/auth/login",
      remoteAddress: "203.0.113.7", // public address: not a trusted proxy
      headers: { "x-forwarded-for": "6.6.6.6" },
      payload: {},
    });
    expect(response.json().forwardedFor).toBe("203.0.113.7");
  });

  it("never exposes the auth service's internal routes", async () => {
    const response = await gateway.inject({ method: "POST", url: "/internal/sessions/verify", payload: {} });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });

  it("answers 503 in the standard envelope when the auth service is down", async () => {
    // Over a real socket: inject()'s simulated request surfaces upstream connect errors differently.
    const offline = gatewayFor("http://127.0.0.1:1");
    const address = await offline.listen({ port: 0, host: "127.0.0.1" });
    const response = await fetch(`${address}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    await offline.close();

    expect(response.status).toBe(503);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe("SERVICE_UNAVAILABLE");
  });
});

describe("origin check", () => {
  const post = (origin: string) =>
    gateway.inject({ method: "POST", url: "/v1/auth/login", headers: { origin }, payload: {} });

  it("rejects state-changing requests from foreign origins", async () => {
    const response = await post("https://evil.example");
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("FORBIDDEN_ORIGIN");
  });

  it("allows the web app's origin", async () => {
    expect((await post("http://localhost:3000")).statusCode).toBe(200);
  });
});

describe("requireSession", () => {
  const whoami = (cookies: Record<string, string> = {}, headers: Record<string, string> = {}) =>
    gateway.inject({ method: "GET", url: "/v1/whoami", cookies, headers });

  it("rejects requests without a valid session", async () => {
    expect((await whoami()).statusCode).toBe(401);
    expect((await whoami({ af_session: "bad-token" })).json().error.code).toBe("UNAUTHENTICATED");
  });

  it("attaches the verified identity and strips identity headers sent by the client", async () => {
    const response = await whoami({ af_session: "good-token" }, { "x-user-id": "someone-else" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      identity: { userId: "user-1", sessionId: "session-1" },
      clientSentUserId: null,
    });
  });
});
