import { isIP } from "node:net";
import type { AuthResponse, MeResponse } from "@agentflow/types";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { Config } from "../../config.js";
import { unauthenticated } from "../../errors.js";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "../sessions/session-cookie.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import type { AuthService, SessionContext } from "./auth.service.js";

type AuthRoutesOptions = { auth: AuthService; config: Config };

function sessionContext(request: FastifyRequest): SessionContext {
  return {
    ip: isIP(request.ip) ? request.ip : null,
    userAgent: request.headers["user-agent"]?.slice(0, 512) ?? null,
  };
}

/** Login attempts are counted per IP *and* email, so one attacker can't lock out every account from one IP. */
function loginRateLimitKey(request: FastifyRequest): string {
  const body = request.body as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  return `${request.ip}:${email}`;
}

/** HTTP layer only: parse input, call the service, set or clear the cookie, shape the response. */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, { auth, config }) => {
  app.post(
    "/register",
    { config: { rateLimit: { max: config.REGISTER_RATE_LIMIT, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const { user, session } = await auth.register(input, sessionContext(request));
      setSessionCookie(reply, session, config);
      return reply.code(201).send({ user } satisfies AuthResponse);
    },
  );

  app.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: config.LOGIN_RATE_LIMIT,
          timeWindow: "15 minutes",
          // preHandler runs after body parsing, so the key can include the email.
          hook: "preHandler",
          keyGenerator: loginRateLimitKey,
        },
      },
    },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const { user, session } = await auth.login(input, readSessionToken(request), sessionContext(request));
      setSessionCookie(reply, session, config);
      return { user } satisfies AuthResponse;
    },
  );

  // Idempotent: always 204 and always clears the cookie, even if the session was already gone.
  app.post("/logout", async (request, reply) => {
    await auth.logout(readSessionToken(request));
    clearSessionCookie(reply, config);
    return reply.code(204).send();
  });

  app.get("/me", async (request, reply) => {
    const token = readSessionToken(request);
    const current = await auth.authenticate(token);
    if (!current) {
      if (token) clearSessionCookie(reply, config); // stale cookie: tell the browser to drop it
      throw unauthenticated();
    }
    return {
      user: current.user,
      session: { expiresAt: current.expiresAt.toISOString() },
    } satisfies MeResponse;
  });
};
