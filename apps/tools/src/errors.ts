import type { ApiErrorBody, ErrorCode, FieldError } from "@agentflow/types";
import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

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
  new AppError(
    401,
    "UNAUTHENTICATED",
    "A valid authenticated user identity is required.",
  );
export const notFound = (resource = "Resource") =>
  new AppError(404, "NOT_FOUND", `${resource} not found.`);
export const forbidden = () =>
  new AppError(403, "FORBIDDEN", "You do not own this tool.");
export const conflict = (message: string) =>
  new AppError(409, "CONFLICT", message);

function body(
  code: ErrorCode,
  message: string,
  details?: FieldError[],
): ApiErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler(
    (error: FastifyError | AppError | ZodError, request, reply) => {
      if (error instanceof AppError)
        return reply
          .code(error.statusCode)
          .send(body(error.code, error.message, error.details));
      if (error instanceof ZodError)
        return reply.code(400).send(
          body(
            "VALIDATION_ERROR",
            "Some fields are invalid.",
            error.issues.map((issue) => ({
              field: issue.path.join(".") || "body",
              message: issue.message,
            })),
          ),
        );
      const status = error.statusCode ?? 500;
      if (status === 413)
        return reply
          .code(status)
          .send(body("PAYLOAD_TOO_LARGE", error.message));
      if (status === 415)
        return reply
          .code(status)
          .send(body("UNSUPPORTED_MEDIA_TYPE", error.message));
      request.log.error(error);
      return reply
        .code(500)
        .send(body("INTERNAL_ERROR", "Something went wrong."));
    },
  );
  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .send(
        body("NOT_FOUND", `Route ${request.method} ${request.url} not found.`),
      ),
  );
}
