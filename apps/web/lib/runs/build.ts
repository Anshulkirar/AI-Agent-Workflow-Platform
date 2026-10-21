import type { Run, RunLog, RunSource, RunStatus, RunStep, RunTrigger, StepTemplate } from "./types";

type BuildRunOptions = {
  id: string;
  source: RunSource;
  status: Exclude<RunStatus, "running">;
  trigger: RunTrigger;
  model: string;
  input: string;
  startedAt: string;
  templates: StepTemplate[];
  output: string;
  /** Scale step durations so the run lasts exactly this long. */
  targetSeconds?: number;
  /** For failed runs: index of the step that fails. */
  failAt?: number;
  error?: string;
  /** For cancelled runs: index of the step that was running. */
  cancelAt?: number;
  rerunOf?: string;
  /** Multiplier applied to each step's token count. */
  tokenScale?: number;
};

const OVERHEAD_MS = 100;

/** Builds a complete, internally consistent historical run. */
export function buildRun(options: BuildRunOptions): Run {
  const { templates, status } = options;
  const total = templates.reduce((sum, step) => sum + step.seconds, 0);
  const scale = options.targetSeconds ? (options.targetSeconds - OVERHEAD_MS / 1000) / total : 1;
  const stopAt = status === "failed" ? (options.failAt ?? templates.length - 1) : status === "cancelled" ? (options.cancelAt ?? 1) : Infinity;

  const steps: RunStep[] = [];
  const logs: RunLog[] = [];
  let logId = 0;
  const log = (atMs: number, level: RunLog["level"], message: string, stepId?: string) =>
    logs.push({ id: ++logId, atMs: Math.round(atMs), level, message, stepId });

  log(0, "info", `Run ${options.id} started · trigger: ${options.trigger} · model: ${options.model}`);
  let clock = OVERHEAD_MS / 2;

  templates.forEach((template, index) => {
    const id = `step-${index + 1}`;
    const base = { id, name: template.name, kind: template.kind, toolId: template.toolId, input: (template.input ?? "").replace("{{input}}", options.input) };
    if (index > stopAt) {
      steps.push({ ...base, status: "skipped", startMs: 0, durationMs: 0, tokens: 0, output: "" });
      return;
    }
    const fullMs = Math.round(template.seconds * scale * 1000);
    const startMs = clock;
    log(startMs, "info", `Starting ${template.name}`, id);
    template.details?.forEach((line, detailIndex) =>
      log(startMs + (fullMs * (detailIndex + 1)) / ((template.details?.length ?? 0) + 1), "debug", line, id),
    );

    if (index === stopAt && status === "failed") {
      const durationMs = Math.round(fullMs * 0.8);
      const error = options.error ?? "Step failed";
      log(startMs + durationMs * 0.6, "warn", `Retrying ${template.name} (attempt 2 of 2)`, id);
      log(startMs + durationMs, "error", error, id);
      steps.push({ ...base, status: "failed", startMs, durationMs, tokens: Math.round(template.tokens * 0.3), output: "", error });
      clock += durationMs;
      return;
    }
    if (index === stopAt && status === "cancelled") {
      const durationMs = Math.round(fullMs * 0.5);
      log(startMs + durationMs, "warn", "Run cancelled by user", id);
      steps.push({ ...base, status: "skipped", startMs, durationMs, tokens: 0, output: "" });
      clock += durationMs;
      return;
    }
    log(startMs + fullMs, "success", `Completed ${template.name} in ${(fullMs / 1000).toFixed(1)}s`, id);
    steps.push({ ...base, status: "success", startMs, durationMs: fullMs, tokens: Math.round(template.tokens * (options.tokenScale ?? 1)), output: template.output });
    clock += fullMs;
  });

  const durationMs = Math.round(clock + OVERHEAD_MS / 2);
  const tokens = steps.reduce((sum, step) => sum + step.tokens, 0);
  if (status === "success") log(durationMs, "success", `Run finished in ${(durationMs / 1000).toFixed(1)}s · ${tokens.toLocaleString("en-US")} tokens`);
  if (status === "failed") log(durationMs, "error", "Run failed");

  const promptTokens = Math.round(tokens * 0.68);
  return {
    id: options.id,
    source: options.source,
    status,
    trigger: options.trigger,
    model: options.model,
    input: options.input,
    output: status === "success" ? options.output : null,
    error: status === "failed" ? options.error : status === "cancelled" ? "Cancelled by user" : undefined,
    startedAt: options.startedAt,
    completedAt: new Date(new Date(options.startedAt).getTime() + durationMs).toISOString(),
    durationMs,
    promptTokens,
    completionTokens: tokens - promptTokens,
    steps,
    logs,
    rerunOf: options.rerunOf,
  };
}
