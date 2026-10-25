import type { Pool } from "@agentflow/db";
import type { FastifyBaseLogger } from "fastify";
import { deleteStaleSessions } from "./sessions.repository.js";

const INTERVAL_MS = 60 * 60 * 1000;
const RETENTION_DAYS = 7;

/**
 * Hourly purge of dead sessions. It lives here, not in the worker, because only the auth
 * service may touch its tables. Returns a function that stops the timer.
 */
export function scheduleSessionCleanup(db: Pool, log: FastifyBaseLogger): () => void {
  const run = () =>
    deleteStaleSessions(db, RETENTION_DAYS).then(
      (deleted) => deleted > 0 && log.info({ deleted }, "removed stale sessions"),
      (error: unknown) => log.error(error, "session cleanup failed"),
    );

  const timer = setInterval(run, INTERVAL_MS);
  timer.unref(); // never keeps the process alive on its own
  return () => clearInterval(timer);
}
