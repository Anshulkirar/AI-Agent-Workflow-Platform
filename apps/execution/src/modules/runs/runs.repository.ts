import type { Pool } from "@agentflow/db";

type RunRow = {
  id: string;
  user_id: string;
  source_type: "agent" | "workflow";
  source_id: string;
  source_name: string;
  trigger: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  input: unknown;
  output: unknown | null;
  error_code: string | null;
  error_message: string | null;
  timeout_ms: number;
  attempt: number;
  max_attempts: number;
  queued_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  duration_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  rerun_of: string | null;
  created_at: Date;
  updated_at: Date;
};

export function toRun(row: RunRow) {
  return {
    id: row.id,
    userId: row.user_id,
    source: { type: row.source_type, id: row.source_id, name: row.source_name },
    status: row.status,
    trigger: row.trigger,
    input: row.input,
    output: row.output,
    error:
      row.error_code || row.error_message
        ? { code: row.error_code, message: row.error_message }
        : undefined,
    timeoutMs: row.timeout_ms,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    queuedAt: row.queued_at.toISOString(),
    startedAt: row.started_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    durationMs: row.duration_ms,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    rerunOf: row.rerun_of ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class RunsRepository {
  constructor(private db: Pool) {}

  async nodeRuns(runId: string) {
    const result = await this.db.query(
      "SELECT * FROM workflow_node_runs WHERE run_id=$1 ORDER BY created_at, node_id",
      [runId],
    );
    return result.rows.map((row) => ({
      ...row,
      input: row.input,
      output: row.output,
      durationMs: row.duration_ms,
      attempt: row.attempt,
      startedAt: row.started_at?.toISOString() ?? null,
      completedAt: row.completed_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async create(
    userId: string,
    input: {
      sourceType: "agent" | "workflow";
      sourceId: string;
      sourceName: string;
      trigger: string;
      input: unknown;
      timeoutMs: number;
      maxAttempts: number;
      rerunOf?: string;
    },
  ) {
    const result = await this.db.query<RunRow>(
      `INSERT INTO execution_runs (user_id, source_type, source_id, source_name, trigger, input, timeout_ms, max_attempts, rerun_of)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        userId,
        input.sourceType,
        input.sourceId,
        input.sourceName,
        input.trigger,
        JSON.stringify(input.input),
        input.timeoutMs,
        input.maxAttempts,
        input.rerunOf ?? null,
      ],
    );
    return toRun(result.rows[0]!);
  }

  async list(userId: string) {
    const result = await this.db.query<RunRow>(
      "SELECT * FROM execution_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200",
      [userId],
    );
    return Promise.all(result.rows.map((row) => this.withLogs(row)));
  }

  async find(userId: string, id: string) {
    const result = await this.db.query<RunRow>(
      "SELECT * FROM execution_runs WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return result.rows[0] ? this.withLogs(result.rows[0]) : null;
  }

  async raw(id: string) {
    const result = await this.db.query<RunRow>(
      "SELECT * FROM execution_runs WHERE id = $1",
      [id],
    );
    return result.rows[0] ? toRun(result.rows[0]) : null;
  }

  async findOwner(id: string) {
    const result = await this.db.query<{ user_id: string }>(
      "SELECT user_id FROM execution_runs WHERE id = $1",
      [id],
    );
    return result.rows[0]?.user_id ?? null;
  }

  async cancel(userId: string, id: string) {
    const result = await this.db.query<RunRow>(
      `UPDATE execution_runs SET status = 'cancelled', completed_at = COALESCE(completed_at, now()),
       duration_ms = CASE WHEN started_at IS NULL THEN 0 ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer END, updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status IN ('queued', 'running') RETURNING *`,
      [id, userId],
    );
    return result.rows[0] ? this.withLogs(result.rows[0]) : null;
  }

  async start(id: string) {
    await this.db.query(
      "UPDATE execution_runs SET status = 'running', attempt = attempt + 1, started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1 AND status = 'queued'",
      [id],
    );
  }

  async complete(id: string, output: unknown) {
    await this.db.query(
      `UPDATE execution_runs SET status = 'completed', output = $2, completed_at = now(),
       duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(started_at, now()))) * 1000)::integer, updated_at = now() WHERE id = $1`,
      [id, JSON.stringify(output)],
    );
  }

  async fail(id: string, code: string, message: string, retryable: boolean) {
    const current = await this.raw(id);
    if (!current) return;
    if (retryable && current.attempt < current.maxAttempts) {
      await this.db.query(
        "UPDATE execution_runs SET status = 'queued', error_code = $2, error_message = $3, updated_at = now() WHERE id = $1",
        [id, code, message],
      );
      return;
    }
    await this.db.query(
      `UPDATE execution_runs SET status = 'failed', error_code = $2, error_message = $3, completed_at = now(),
       duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(started_at, now()))) * 1000)::integer, updated_at = now() WHERE id = $1`,
      [id, code, message],
    );
  }

  async addLog(id: string, level: string, message: string, stepId?: string) {
    const result = await this.db.query<{ at_ms: number }>(
      "INSERT INTO execution_logs (run_id, at_ms, level, message, step_id) SELECT $1, GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer, $2, $3, $4 FROM execution_runs WHERE id = $1 RETURNING at_ms",
      [id, level, message, stepId ?? null],
    );
    return result.rows[0]?.at_ms ?? 0;
  }

  async logs(id: string) {
    const result = await this.db.query<{
      id: string;
      at_ms: number;
      level: string;
      message: string;
      step_id: string | null;
      created_at: Date;
    }>(
      "SELECT id, at_ms, level, message, step_id, created_at FROM execution_logs WHERE run_id = $1 ORDER BY id",
      [id],
    );
    return result.rows.map((log) => ({
      id: Number(log.id),
      atMs: log.at_ms,
      level: log.level,
      message: log.message,
      stepId: log.step_id ?? undefined,
      createdAt: log.created_at.toISOString(),
    }));
  }

  private async withLogs(row: RunRow) {
    return { ...toRun(row), logs: await this.logs(row.id) };
  }
}
