import type { NextRequest } from "next/server";
import type { ApiErrorBody } from "@agentflow/types";

/*
 * Same-origin bridge: browser → /api/* on this server → API gateway. Same-origin means the session
 * cookie is first-party (SameSite=Lax works) and there is no CORS to configure.
 *
 * This is a route handler rather than a `rewrites()` entry because Next's rewrite proxy drops the
 * client's address. Here Next has already filled `x-forwarded-for` from the socket (or kept the one
 * your load balancer set), and we pass it on so the gateway rate-limits each user, not this server.
 */

const API_URL = process.env.API_URL ?? "http://127.0.0.1:4000";

// Connection-level headers that describe this hop only and must not be forwarded.
const HOP_BY_HOP = ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "te", "trailer"];

export const dynamic = "force-dynamic";

async function forward(request: NextRequest): Promise<Response> {
  const target = new URL(request.nextUrl.pathname.replace(/^\/api/, "") + request.nextUrl.search, API_URL);

  const headers = new Headers(request.headers);
  for (const name of [...HOP_BY_HOP, "host", "content-length"]) headers.delete(name);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      // Required by Node's fetch to stream a request body.
      duplex: "half",
      redirect: "manual",
      cache: "no-store",
      signal: request.signal,
    } as RequestInit);
  } catch {
    const body: ApiErrorBody = { error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable." } };
    return Response.json(body, { status: 503 });
  }

  const responseHeaders = new Headers(upstream.headers);
  // fetch already decoded the body, so the original encoding and length no longer apply.
  for (const name of [...HOP_BY_HOP, "content-encoding", "content-length"]) responseHeaders.delete(name);

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT };
