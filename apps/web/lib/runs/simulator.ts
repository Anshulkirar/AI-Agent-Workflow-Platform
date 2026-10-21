import { toolsById } from "@/lib/agents/catalog";
import type { Workflow } from "@/lib/agents/types";
import { mockFinalOutput, mockNodeOutput, planExecution } from "@/lib/agents/workflow";
import { newRunId, runStore } from "./store";
import type { Run, RunLog, RunSource, RunStep, RunTrigger, StepTemplate } from "./types";

/*
 * Simulates a run in real time by advancing it inside the run store, so any
 * page showing the run updates live. Nothing is sent to a real model.
 */

const active = new Set<string>();
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function isSimulating(id: string) {
  return active.has(id);
}

type SimulationOptions = {
  source: RunSource;
  input: string;
  model: string;
  trigger: RunTrigger;
  templates: StepTemplate[];
  output: string;
  rerunOf?: string;
  onFinish?: (run: Run) => void;
};

export function startSimulatedRun(options: SimulationOptions): string {
  const id = newRunId();
  const started = Date.now();
  let logId = 0;
  const logLine = (level: RunLog["level"], message: string, stepId?: string): RunLog => ({
    id: ++logId,
    atMs: Date.now() - started,
    level,
    message,
    stepId,
  });

  runStore.add({
    id,
    source: options.source,
    status: "running",
    trigger: options.trigger,
    model: options.model,
    input: options.input,
    output: null,
    startedAt: new Date(started).toISOString(),
    completedAt: null,
    durationMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    rerunOf: options.rerunOf,
    steps: options.templates.map<RunStep>((template, index) => ({
      id: `step-${index + 1}`,
      name: template.name,
      kind: template.kind,
      toolId: template.toolId,
      status: "pending",
      startMs: 0,
      durationMs: 0,
      tokens: 0,
      input: (template.input ?? "").replace("{{input}}", options.input),
      output: "",
    })),
    logs: [
      {
        id: ++logId,
        atMs: 0,
        level: "info",
        message: `Run ${id} started · trigger: ${options.trigger} · model: ${options.model}${options.rerunOf ? ` · rerun of ${options.rerunOf}` : ""}`,
      },
    ],
  });
  active.add(id);

  const patchStep = (stepId: string, patch: Partial<RunStep>, ...logs: RunLog[]) =>
    runStore.update(id, (run) => ({
      steps: run.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
      logs: [...run.logs, ...logs],
      durationMs: Date.now() - started,
    }));

  void (async () => {
    let tokens = 0;
    for (const [index, template] of options.templates.entries()) {
      if (!active.has(id)) return;
      const stepId = `step-${index + 1}`;
      const startMs = Date.now() - started;
      patchStep(stepId, { status: "running", startMs }, logLine("info", `Starting ${template.name}`, stepId));

      const duration = 700 + Math.random() * 1300;
      const details = template.details ?? [];
      for (const detail of details) {
        await sleep(duration / (details.length + 1));
        if (!active.has(id)) return;
        patchStep(stepId, {}, logLine("debug", detail, stepId));
      }
      await sleep(duration / (details.length + 1));
      if (!active.has(id)) return;

      const durationMs = Date.now() - started - startMs;
      tokens += template.tokens;
      patchStep(
        stepId,
        { status: "success", durationMs, tokens: template.tokens, output: template.output },
        logLine("success", `Completed ${template.name} in ${(durationMs / 1000).toFixed(1)}s`, stepId),
      );
    }

    if (!active.has(id)) return;
    active.delete(id);
    const durationMs = Date.now() - started;
    const promptTokens = Math.round(tokens * 0.68);
    runStore.update(id, (run) => ({
      status: "success",
      output: options.output,
      completedAt: new Date().toISOString(),
      durationMs,
      promptTokens,
      completionTokens: tokens - promptTokens,
      logs: [
        ...run.logs,
        logLine("success", `Run finished in ${(durationMs / 1000).toFixed(1)}s · ${tokens.toLocaleString("en-US")} tokens`),
      ],
    }));
    const finished = runStore.get(id);
    if (finished) options.onFinish?.(finished);
  })();

  return id;
}

export function cancelRun(id: string) {
  if (!active.delete(id)) return;
  const run = runStore.get(id);
  if (!run) return;
  const atMs = Date.now() - new Date(run.startedAt).getTime();
  runStore.update(id, {
    status: "cancelled",
    error: "Cancelled by user",
    completedAt: new Date().toISOString(),
    durationMs: atMs,
    steps: run.steps.map((step) =>
      step.status === "running"
        ? { ...step, status: "skipped", durationMs: atMs - step.startMs }
        : step.status === "pending"
          ? { ...step, status: "skipped" }
          : step,
    ),
    logs: [...run.logs, { id: run.logs.length + 1, atMs, level: "warn", message: "Run cancelled by user" }],
  });
}

/** Re-executes a previous run with the same input and step plan. */
export function rerun(run: Run, onFinish?: (run: Run) => void) {
  return startSimulatedRun({
    source: run.source,
    input: run.input,
    model: run.model,
    trigger: "rerun",
    rerunOf: run.id,
    output: run.output ?? mockFinalOutput(run.source.name, run.input, []),
    templates: run.steps.map((step) => ({
      name: step.name,
      kind: step.kind,
      toolId: step.toolId,
      seconds: step.durationMs / 1000,
      tokens: step.tokens || 300 + Math.round(Math.random() * 900),
      input: step.input,
      output: step.output || `${step.name} completed successfully.`,
    })),
    onFinish,
  });
}

/** Turns a workflow graph into an execution plan for the simulator. */
export function templatesFromGraph(graph: Workflow, input: string): { templates: StepTemplate[]; output: (name: string) => string } {
  const plan = planExecution(graph.nodes, graph.edges);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const ordered = plan.levels.flat().map((id) => byId.get(id)).filter((node) => node !== undefined);
  const templates: StepTemplate[] = [
    { name: "Initialize workflow", kind: "system", seconds: 1, tokens: 180, input: "Load graph and credentials", output: `Validated ${graph.nodes.length} nodes and ${graph.edges.length} connections.` },
    ...ordered
      .filter((node) => node.data.kind !== "input")
      .map<StepTemplate>((node) => ({
        name: node.data.label,
        kind: node.data.kind,
        toolId: node.data.toolId,
        seconds: 2,
        tokens: node.data.kind === "llm" || node.data.kind === "agent" || node.data.kind === "transform" ? 900 + Math.round(Math.random() * 1800) : 120 + Math.round(Math.random() * 400),
        input: node.data.kind === "tool" ? (toolsById.get(node.data.toolId ?? "")?.description ?? "") : "{{input}}",
        output: mockNodeOutput(node.data, input),
      })),
  ];
  const toolNames = ordered.filter((node) => node.data.kind === "tool").map((node) => node.data.label);
  return { templates, output: (name) => mockFinalOutput(name, input, toolNames) };
}
