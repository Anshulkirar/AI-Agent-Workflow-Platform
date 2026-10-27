import { setTimeout as sleep } from "node:timers/promises";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { ServiceRoute } from "../src/services.js";

// One fake server plays two services: "auth" (public) and "things" (session-protected).
// Its routes echo back what the gateway forwarded, so tests can inspect the hop.
let upstream: FastifyInstance;
let upstreamUrl: string;
let thingsCalls = 0;

const echo = (request: { url: string; headers: Record<string, unknown>; body?: unknown }) => ({
  path: request.url,
  body: request.body,
  forwardedFor: request.headers["x-forwarded-for"],
  requestId: request.headers["x-request-id"],
  userId: request.headers["x-user-id"] ?? null,
  sessionId: request.headers["x-session-id"] ?? null,
  cookie: request.headers.cookie ?? null,
});

function servicesAt(url: string): ServiceRoute[] {
  return [
    { name: "auth", prefix: "/v1/auth", upstream: url, rewritePrefix: "/auth", access: "public" },
    { name: "things", prefix: "/v1/things", upstream: url, rewritePrefix: "/things", access: "session" },
  ];
}

function gateway(env: Record<string, string> = {}, url = upstreamUrl) {
  const config = loadConfig({ LOG_LEVEL: "silent", AUTH_SERVICE_URL: url, ...env });
  return buildApp({ config, services: servicesAt(url) });
}

/** Some failures (refused connections, timeouts) only behave realistically over a real socket. */
async function fetchVia(app: FastifyInstance, path: string, init?: RequestInit) {
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  try {
    const response = await fetch(`${address}${path}`, init);
    return { status: response.status, body: (await response.json()) as { error?: { code: string } } };
  } finally {
    await app.close();
  }
}

let app: FastifyInstance;

beforeAll(async () => {
  upstream = Fastify();
  upstream.get("/health", async () => ({ status: "ok" }));
  upstream.post("/auth/login", async (request, reply) =>
    reply.header("set-cookie", "af_session=abc; HttpOnly; Path=/").send(echo(request)),
  );
  upstream.post<{ Body: { token: string } }>("/internal/sessions/verify", async (request, reply) =>
    request.body.token === "good-token"
      ? { userId: "user-1", sessionId: "session-1" }
      : reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "no" } }),
  );
  upstream.get("/things/slow", async () => {
    await sleep(1_000);
    return {};
  });
  upstream.all("/things/*", async (request) => {
    thingsCalls++;
    return echo(request);
  });
  upstreamUrl = await upstream.listen({ port: 0, host: "127.0.0.1" });

  app = gateway();
  await app.ready();
});

beforeEach(() => {
  thingsCalls = 0;
});

afterAll(async () => {
  await app.close();
  await upstream.close();
});

describe("health checks", () => {
  it("keeps / and /health as liveness checks", async () => {
    expect((await app.inject("/")).body).toBe("API Server is running!");
    expect((await app.inject("/health")).json()).toEqual({ status: "ok" });
  });

  it("reports readiness of every registered service", async () => {
    const response = await app.inject("/ready");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", services: { auth: "ok", things: "ok" } });
  });

  it("is not ready when a service is unreachable", async () => {
    const offline = gateway({}, "http://127.0.0.1:1");
    const response = await offline.inject("/ready");
    await offline.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "degraded", services: { auth: "unreachable", things: "unreachable" } });
  });
});

describe("public service (auth)", () => {
  it("forwards /v1/auth/* to /auth/* and passes Set-Cookie back", async () => {
    const response = await app.inject({ method: "POST", url: "/v1/auth/login", payload: { email: "a@b.co" } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ path: "/auth/login", body: { email: "a@b.co" } });
    expect(response.headers["set-cookie"]).toContain("af_session=abc");
  });

  it("replaces a spoofed X-Forwarded-For with the client IP it actually saw", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      remoteAddress: "203.0.113.7", // public address: not a trusted proxy
      headers: { "x-forwarded-for": "6.6.6.6" },
      payload: {},
    });
    expect(response.json().forwardedFor).toBe("203.0.113.7");
  });

  it("never forwards identity headers a client made up", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "x-user-id": "someone-else" },
      payload: {},
    });
    expect(response.json().userId).toBeNull();
  });

  it("never exposes a service's internal routes", async () => {
    const response = await app.inject({ method: "POST", url: "/internal/sessions/verify", payload: {} });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });
});

describe("session-protected service", () => {
  const callThings = (cookies: Record<string, string> = {}, headers: Record<string, string> = {}) =>
    app.inject({ method: "GET", url: "/v1/things/list", cookies, headers });

  it("rejects requests without a valid session before they reach the service", async () => {
    const attempts: Record<string, string>[] = [{}, { af_session: "bad-token" }];
    for (const cookies of attempts) {
      const response = await callThings(cookies);
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHENTICATED");
    }
    expect(thingsCalls).toBe(0);
  });

  it("forwards the verified identity instead of the session cookie", async () => {
    const response = await callThings({ af_session: "good-token" }, { "x-user-id": "someone-else" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      path: "/things/list",
      userId: "user-1", // from the auth service, not the client's header
      sessionId: "session-1",
      cookie: null, // the token never leaves the gateway
    });
  });
});

describe("request ids", () => {
  it("gives every request its own id, returns it, and forwards it to the service", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "x-request-id": "client-chosen" },
      payload: {},
    });
    const id = response.headers["x-request-id"];

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.json().requestId).toBe(id);
  });
});

describe("upstream failures", () => {
  const post = { method: "POST", headers: { "content-type": "application/json" }, body: "{}" };

  it("answers 503 in the standard envelope when a service is down", async () => {
    const { status, body } = await fetchVia(gateway({}, "http://127.0.0.1:1"), "/v1/auth/login", post);
    expect(status).toBe(503);
    expect(body.error?.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("answers 504 when a service is too slow", async () => {
    const { status, body } = await fetchVia(gateway({ UPSTREAM_TIMEOUT_MS: "200" }), "/v1/things/slow", {
      headers: { cookie: "af_session=good-token" },
    });
    expect(status).toBe(504);
    expect(body.error?.code).toBe("GATEWAY_TIMEOUT");
  });
});

describe("origin check", () => {
  const post = (origin: string) =>
    app.inject({ method: "POST", url: "/v1/auth/login", headers: { origin }, payload: {} });

  it("rejects state-changing requests from foreign origins", async () => {
    const response = await post("https://evil.example");
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("FORBIDDEN_ORIGIN");
  });

  it("allows the web app's origin", async () => {
    expect((await post("http://localhost:3000")).statusCode).toBe(200);
  });
});

describe("rate limiting", () => {
  it("limits each client IP across proxied routes, but never health checks", async () => {
    const limited = gateway({ RATE_LIMIT_MAX: "2" });
    const login = () => limited.inject({ method: "POST", url: "/v1/auth/login", payload: {} });

    expect((await login()).statusCode).toBe(200);
    expect((await login()).statusCode).toBe(200);
    const blocked = await login();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe("RATE_LIMITED");
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);

    expect((await limited.inject("/health")).statusCode).toBe(200);
    await limited.close();
  });
});
