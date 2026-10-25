import { SESSION_COOKIE_NAME } from "@agentflow/types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Config } from "../../config.js";

/** `maxAge` (seconds) is set only for "remember me" sessions. */
export type IssuedSession = { token: string; expiresAt: Date; maxAge: number | undefined };

function baseOptions(config: Config) {
  return {
    httpOnly: true, // invisible to JavaScript, so XSS can't read the token
    secure: config.COOKIE_SECURE, // HTTPS only (browsers also allow it on http://localhost)
    sameSite: "lax" as const, // not sent on cross-site POSTs — the main CSRF defence
    path: "/",
  };
}

export function readSessionToken(request: FastifyRequest): string | undefined {
  return request.cookies[SESSION_COOKIE_NAME];
}

export function setSessionCookie(reply: FastifyReply, session: IssuedSession, config: Config) {
  reply.setCookie(SESSION_COOKIE_NAME, session.token, {
    ...baseOptions(config),
    // Without maxAge the browser drops the cookie when it closes ("remember me" unchecked).
    ...(session.maxAge !== undefined && { maxAge: session.maxAge }),
  });
}

export function clearSessionCookie(reply: FastifyReply, config: Config) {
  reply.clearCookie(SESSION_COOKIE_NAME, baseOptions(config));
}
