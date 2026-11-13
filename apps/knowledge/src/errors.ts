import type { ApiErrorBody, ErrorCode, FieldError } from "@agentflow/types";
import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(readonly statusCode: number, readonly code: ErrorCode, message: string, readonly details?: FieldError[]) {
    super(message);
    this.name = "AppError";
  }
}
export const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "A valid authenticated user identity is required.");
export const notFound = (resource = "Knowledge source") => new AppError(404, "NOT_FOUND", `${resource} not found.`);
export const forbidden = () => new AppError(403, "FORBIDDEN", "You do not own this knowledge source.");

export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request, reply) => {
    if (error instanceof AppError)
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, details: error.details } });
    if (error instanceof ZodError)
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Some fields are invalid.",
          details: error.issues.map((issue) => ({ field: issue.path.join(".") || "body", message: issue.message })),
        },
      });
    if ((error.statusCode ?? 500) === 413)
      return reply.code(413).send({ error: { code: "PAYLOAD_TOO_LARGE", message: error.message } });
    request.log.error(error);
    return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({ error: { code: "NOT_FOUND", message: `Route ${request.method} ${request.url} not found.` } }),
  );
}
