import type { ApiErrorBody, ErrorCode } from "@agentflow/types";
import type { FastifyError, FastifyInstance } from "fastify";

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const serviceUnavailable = () =>
  new AppError(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable.");

// Fastify's and plugins' own 4xx errors, mapped to our codes so clients can branch on `code`.
const CLIENT_ERROR_CODES: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  404: "NOT_FOUND",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  429: "RATE_LIMITED",
};

const body = (code: ErrorCode, message: string): ApiErrorBody => ({ error: { code, message } });

/**
 * Gateway-generated errors use the same envelope as the services behind it. Errors a service
 * returns are not errors here: proxied responses pass through untouched.
 */
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(body(error.code, error.message));
    }

    const status = error.statusCode ?? 500;
    if (status < 500) {
      return reply.code(status).send(body(CLIENT_ERROR_CODES[status] ?? "BAD_REQUEST", error.message));
    }

    request.log.error(error);
    return reply.code(500).send(body("INTERNAL_ERROR", "Something went wrong."));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send(body("NOT_FOUND", `Route ${request.method} ${request.url} not found.`)),
  );
}
