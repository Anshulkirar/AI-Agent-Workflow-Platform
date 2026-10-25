import type {
  ApiErrorBody,
  AuthResponse,
  ErrorCode,
  FieldError,
  LoginRequest,
  RegisterRequest,
} from "@agentflow/types";

/**
 * Browser-side calls to the auth service, through the same-origin /api rewrite.
 * The session lives in an HttpOnly cookie that the browser attaches by itself:
 * nothing here reads, stores or forwards a token.
 */

export class AuthRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details: FieldError[] = [],
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/auth${path}`, {
      method: "POST",
      // Logout has no body; sending a JSON content type with an empty body is a 400.
      ...(body !== undefined && {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    throw new AuthRequestError(0, "SERVICE_UNAVAILABLE", "Can't reach the server. Check your connection.");
  }

  if (response.ok) return (response.status === 204 ? undefined : await response.json()) as T;

  const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
  const retryAfter = Number(response.headers.get("retry-after")) || undefined;
  throw new AuthRequestError(
    response.status,
    payload?.error.code ?? "INTERNAL_ERROR",
    payload?.error.message ?? "Something went wrong. Please try again.",
    payload?.error.details,
    retryAfter,
  );
}

export const authClient = {
  register: (input: RegisterRequest) => request<AuthResponse>("/register", input),
  login: (input: LoginRequest) => request<AuthResponse>("/login", input),
  logout: () => request<void>("/logout"),
};

/** Only same-site paths, so `?next=https://evil.example` can't turn login into an open redirect. */
export function safeRedirectPath(next: string | null, fallback = "/dashboard"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
