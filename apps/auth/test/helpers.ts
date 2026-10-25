import { createPool } from "@agentflow/db";
import { SESSION_COOKIE_NAME } from "@agentflow/types";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

export function testDatabaseUrl(): string {
  const url = process.env.AUTH_TEST_DATABASE_URL;
  if (!url) throw new Error("AUTH_TEST_DATABASE_URL is not set — see .env.example.");
  // Tests TRUNCATE tables: refuse to run against anything that isn't a *_test database.
  if (!new URL(url).pathname.endsWith("_test")) {
    throw new Error("AUTH_TEST_DATABASE_URL must point at a database whose name ends in _test.");
  }
  return url;
}

/** A real app on the test database. Rate limits are high unless a test lowers them. */
export async function setupTestApp(env: Record<string, string> = {}) {
  const config = loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    AUTH_DATABASE_URL: testDatabaseUrl(),
    LOGIN_RATE_LIMIT: "1000",
    REGISTER_RATE_LIMIT: "1000",
    ...env,
  });
  const db = createPool(config.AUTH_DATABASE_URL, { max: 4 });
  const app = buildApp({ config, db });
  await app.ready();

  return {
    app,
    db,
    reset: () => db.query("TRUNCATE users, sessions"),
    close: async () => {
      await app.close();
      await db.end();
    },
  };
}

export const ada = { name: "Ada Lovelace", email: "ada@example.com", password: "analytical1" };

export function sessionCookie(response: LightMyRequestResponse) {
  return response.cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
}

export const withSession = (token: string) => ({ [SESSION_COOKIE_NAME]: token });

export function register(app: FastifyInstance, body: object = ada) {
  return app.inject({ method: "POST", url: "/auth/register", payload: body });
}

export function login(app: FastifyInstance, body: object, cookies: Record<string, string> = {}) {
  return app.inject({ method: "POST", url: "/auth/login", payload: body, cookies });
}

/** Registers Ada and returns her session token. */
export async function registerAndGetToken(app: FastifyInstance): Promise<string> {
  const token = sessionCookie(await register(app))?.value;
  if (!token) throw new Error("registration did not set a session cookie");
  return token;
}
