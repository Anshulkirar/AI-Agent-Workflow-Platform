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

const body = (code: ErrorCode, message: string): ApiErrorBody => ({ error: { code, message } });

/** Gateway-generated errors use the same envelope as the services behind it. */
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(body(error.code, error.message));
    }

    const status = error.statusCode ?? 500;
    if (status < 500) return reply.code(status).send(body("BAD_REQUEST", error.message));

    request.log.error(error);
    return reply.code(500).send(body("INTERNAL_ERROR", "Something went wrong."));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send(body("NOT_FOUND", `Route ${request.method} ${request.url} not found.`)),
  );
}
