// Shared domain types consumed by api, worker and web.

// --- Errors: every service responds with this envelope ---

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN_ORIGIN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT";

export type FieldError = { field: string; message: string };

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: FieldError[] };
};

// --- Auth ---

/** Name of the HttpOnly cookie that carries the opaque session token. */
export const SESSION_COOKIE_NAME = "af_session";

/** The only user shape that ever leaves the auth service — never includes the password hash. */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type RegisterRequest = { name: string; email: string; password: string };
export type LoginRequest = { email: string; password: string; remember?: boolean };

export type AuthResponse = { user: PublicUser };
export type MeResponse = { user: PublicUser; session: { expiresAt: string } };

/** Auth service → gateway, from the internal-only `POST /internal/sessions/verify`. */
export type SessionVerification = { userId: string; sessionId: string };
