import { createPool } from "@agentflow/db";
import { Redis } from "ioredis";
import { z } from "zod";

const env = z
  .object({
    EXECUTION_DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
  })
  .parse(process.env);
const db = createPool(env.EXECUTION_DATABASE_URL);
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = "agentflow:execution:queue";
let stopping = false;

console.log("[worker] started");
void consume();

async function consume() {
  while (!stopping) {
    try {
      const job = await redis.brpop(queue, 5);
      if (!job) continue;
      await execute(job[1]);
    } catch (error) {
      console.error("execution worker error", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function execute(id: string) {
  const run = await db.query<{
    timeout_ms: number;
    status: string;
    attempt: number;
    max_attempts: number;
  }>(
    "SELECT timeout_ms, status, attempt, max_attempts FROM execution_runs WHERE id = $1",
    [id],
  );
  const row = run.rows[0];
  if (!row || row.status === "cancelled") return;

  await db.query(
    "UPDATE execution_runs SET status = 'running', attempt = attempt + 1, started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1 AND status IN ('queued', 'running')",
    [id],
  );
  await addLog(id, "info", "Execution started");

  try {
    const output = await simulateExecution(row.timeout_ms);
    await db.query(
      `UPDATE execution_runs SET status = 'completed', output = $2, completed_at = now(),
       duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(started_at, now()))) * 1000)::integer, updated_at = now()
       WHERE id = $1 AND status = 'running'`,
      [id, JSON.stringify(output)],
    );
    await addLog(id, "success", "Execution completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    const current = await db.query<{ attempt: number; max_attempts: number }>(
      "SELECT attempt, max_attempts FROM execution_runs WHERE id = $1",
      [id],
    );
    const retry =
      current.rows[0] && current.rows[0].attempt < current.rows[0].max_attempts;
    await db.query(
      retry
        ? "UPDATE execution_runs SET status = 'queued', error_message = $2, updated_at = now() WHERE id = $1"
        : "UPDATE execution_runs SET status = 'failed', error_message = $2, completed_at = now(), updated_at = now() WHERE id = $1",
      [id, message],
    );
    await addLog(id, "error", message);
    if (retry) await redis.rpush(queue, id);
  }
}

async function simulateExecution(timeoutMs: number) {
  await Promise.race([
    new Promise<void>((resolve) => setTimeout(resolve, 100)),
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error("Execution timed out")), timeoutMs),
    ),
  ]);
  return { status: "ok", completedAt: new Date().toISOString() };
}

async function addLog(id: string, level: string, message: string) {
  await db.query(
    "INSERT INTO execution_logs (run_id, at_ms, level, message) SELECT $1, GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer, $2, $3 FROM execution_runs WHERE id = $1",
    [id, level, message],
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stopping = true;
    void Promise.all([redis.quit(), db.end()]).then(() => process.exit(0));
  });
}
