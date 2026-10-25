import type { SessionVerification } from "@agentflow/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { unauthenticated } from "../../errors.js";
import type { AuthService } from "../auth/auth.service.js";

const verifySchema = z.object({ token: z.string().max(256) });

/**
 * Service-to-service API. The gateway never routes /internal/*, so browsers can't reach it;
 * other services ask "who is this token?" here instead of reading the sessions table.
 */
export const internalRoutes: FastifyPluginAsync<{ auth: AuthService }> = async (app, { auth }) => {
  app.post("/sessions/verify", async (request) => {
    const { token } = verifySchema.parse(request.body);
    const current = await auth.authenticate(token);
    if (!current) throw unauthenticated();
    return { userId: current.user.id, sessionId: current.sessionId } satisfies SessionVerification;
  });
};
