import type { ApiErrorBody, ErrorCode, FieldError } from "@agentflow/types";
import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

/** An error that is safe to show the client: it carries its own status, code and message. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: FieldError[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthenticated = () =>
  new AppError(401, "UNAUTHENTICATED", "You need to sign in to continue.");

// Fastify's own 4xx errors (bad JSON, wrong content type, body too large) mapped to our codes.
const FRAMEWORK_CODES: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
};

function toBody(code: ErrorCode, message: string, details?: FieldError[]): ApiErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}

/** Every error leaves the service in the same `{ error: { code, message, details? } }` shape. */
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(toBody(error.code, error.message, error.details));
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      }));
      return reply.code(400).send(toBody("VALIDATION_ERROR", "Some fields are invalid.", details));
    }

    const status = error.statusCode ?? 500;
    const frameworkCode = FRAMEWORK_CODES[status];
    if (frameworkCode) return reply.code(status).send(toBody(frameworkCode, error.message));

    // Anything else is a bug or an outage: log it, but never leak internals to the client.
    request.log.error(error);
    return reply.code(500).send(toBody("INTERNAL_ERROR", "Something went wrong."));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send(toBody("NOT_FOUND", `Route ${request.method} ${request.url} not found.`)),
  );
}
