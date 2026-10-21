"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { modelName } from "@/lib/agents/catalog";
import type { ModelSettings, NodeRunStatus } from "@/lib/agents/types";
import { mockFinalOutput, mockNodeOutput, planExecution } from "@/lib/agents/workflow";
import { newRunId, runStore } from "@/lib/runs/store";
import type { Run, RunSource, RunStep } from "@/lib/runs/types";
import type { AppEdge, AppNode } from "./types";

export type LogLevel = "info" | "success" | "warn" | "error";
export type LogEntry = { id: number; at: number; level: LogLevel; message: string; nodeId?: string };
export type RunStatus = "idle" | "running" | "success" | "error" | "stopped";
export type RunState = {
  status: RunStatus;
  logs: LogEntry[];
  output: string | null;
  durationMs: number;
  tokens: number;
  /** Id of the run record saved when the test finished. */
  runId: string | null;
};

type RunContext = {
  input: string;
  startedAt: string;
  started: number;
  logs: LogEntry[];
  steps: RunStep[];
  stepIds: Map<string, string>;
};

const idle: RunState = { status: "idle", logs: [], output: null, durationMs: 0, tokens: 0, runId: null };
let logSequence = 0;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Simulates executing the workflow on the canvas: nodes light up level by
 * level (parallel branches together), edges animate, and mock logs/output
 * stream in. Each test is saved as a run record. Nothing is sent to a model.
 */
export function useTestRun({
  source,
  settings,
  onComplete,
}: {
  source: RunSource;
  settings: ModelSettings;
  onComplete?: (run: Run) => void;
}) {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow<AppNode, AppEdge>();
  const [state, setState] = useState<RunState>(idle);
  const runRef = useRef(0);
  const contextRef = useRef<RunContext | null>(null);

  // Cancel any in-flight run when the builder unmounts.
  useEffect(() => {
    const ref = runRef;
    return () => {
      ref.current++;
    };
  }, []);

  const setStatus = useCallback(
    (ids: Set<string>, status: NodeRunStatus) =>
      setNodes((nodes) =>
        nodes.map((node) => (ids.has(node.id) ? { ...node, data: { ...node.data, status } } : node)),
      ),
    [setNodes],
  );

  const clearVisuals = useCallback(() => {
    setNodes((nodes) => nodes.map((node) => ({ ...node, data: { ...node.data, status: undefined } })));
    setEdges((edges) => edges.map((edge) => ({ ...edge, animated: false, className: undefined })));
  }, [setNodes, setEdges]);

  /** Persists the finished test as a run so it appears under Runs. */
  const record = useCallback(
    (context: RunContext, status: Run["status"], output: string | null, error?: string) => {
      const durationMs = Math.round(performance.now() - context.started);
      const tokens = context.steps.reduce((sum, step) => sum + step.tokens, 0);
      const promptTokens = Math.round(tokens * 0.68);
      const run: Run = {
        id: newRunId(),
        source,
        status,
        trigger: "test",
        model: settings.model,
        input: context.input,
        output,
        error,
        startedAt: context.startedAt,
        completedAt: new Date().toISOString(),
        durationMs,
        promptTokens,
        completionTokens: tokens - promptTokens,
        steps: context.steps,
        logs: context.logs.map((entry) => ({
          id: entry.id,
          atMs: Math.round(entry.at),
          level: entry.level,
          message: entry.message,
          stepId: entry.nodeId ? context.stepIds.get(entry.nodeId) : undefined,
        })),
      };
      runStore.add(run);
      onComplete?.(run);
      return run.id;
    },
    [onComplete, settings.model, source],
  );

  const run = useCallback(
    async (input: string) => {
      const runId = ++runRef.current;
      const alive = () => runRef.current === runId;
      const started = performance.now();
      const context: RunContext = {
        input,
        started,
        startedAt: new Date().toISOString(),
        logs: [],
        steps: [],
        stepIds: new Map(),
      };
      contextRef.current = context;
      const log = (level: LogLevel, message: string, nodeId?: string) => {
        context.logs.push({ id: ++logSequence, at: performance.now() - started, level, message, nodeId });
        setState((current) => ({ ...current, logs: [...context.logs] }));
      };

      setState({ ...idle, status: "running" });
      const nodes = getNodes();
      const edges = getEdges();
      const plan = planExecution(nodes, edges);
      const byId = new Map(nodes.map((node) => [node.id, node]));

      setNodes((current) =>
        current.map((node) => ({
          ...node,
          data: { ...node.data, status: plan.reachable.has(node.id) ? "idle" : "skipped" },
        })),
      );
      setEdges((current) => current.map((edge) => ({ ...edge, animated: false, className: undefined })));

      log("info", `Starting test run · ${modelName(settings.model)} · temperature ${settings.temperature.toFixed(1)}`);
      await sleep(300);
      if (!alive()) return;

      if (plan.errors.length) {
        plan.errors.forEach((message) => log("error", message));
        context.steps.push({
          id: "step-1",
          name: "Validate workflow",
          kind: "system",
          status: "failed",
          startMs: 0,
          durationMs: Math.round(performance.now() - started),
          tokens: 0,
          input: `${nodes.length} nodes, ${edges.length} connections`,
          output: "",
          error: plan.errors.join(" "),
        });
        const savedId = record(context, "failed", null, plan.errors[0]);
        contextRef.current = null;
        setState((current) => ({ ...current, status: "error", durationMs: performance.now() - started, runId: savedId }));
        return;
      }
      plan.warnings.forEach((message) => log("warn", message));

      let tokens = 0;
      for (const level of plan.levels) {
        const ids = new Set(level);
        const levelStart = performance.now() - started;
        level.forEach((id) => context.stepIds.set(id, `step-${context.stepIds.size + 1}`));
        setStatus(ids, "running");
        setEdges((current) =>
          current.map((edge) =>
            ids.has(edge.target) && plan.activeEdges.has(edge.id)
              ? { ...edge, animated: true, className: "af-edge-running" }
              : edge,
          ),
        );
        level.forEach((id) => log("info", `Running ${byId.get(id)?.data.label ?? id}…`, id));

        await sleep(600 + Math.random() * 700);
        if (!alive()) return;

        setStatus(ids, "success");
        setEdges((current) =>
          current.map((edge) =>
            ids.has(edge.target) && plan.activeEdges.has(edge.id)
              ? { ...edge, animated: false, className: "af-edge-done" }
              : edge,
          ),
        );
        const levelDuration = performance.now() - started - levelStart;
        level.forEach((id) => {
          const node = byId.get(id);
          if (!node) return;
          const heavy = node.data.kind === "llm" || node.data.kind === "transform" || node.data.kind === "agent";
          const stepTokens = heavy ? 450 + Math.round(Math.random() * 700) : 30 + Math.round(Math.random() * 90);
          const message = mockNodeOutput(node.data, input);
          tokens += stepTokens;
          context.steps.push({
            id: context.stepIds.get(id)!,
            name: node.data.label,
            kind: node.data.kind,
            toolId: node.data.toolId,
            status: "success",
            startMs: Math.round(levelStart),
            durationMs: Math.round(levelDuration),
            tokens: stepTokens,
            input: node.data.kind === "input" ? input : "Output of previous step",
            output: message,
          });
          log("success", message, id);
        });
      }

      const toolNames = nodes
        .filter((node) => plan.reachable.has(node.id) && node.data.kind === "tool")
        .map((node) => node.data.label);
      const durationMs = performance.now() - started;
      const output = mockFinalOutput(source.name, input, toolNames);
      log("success", `Run completed in ${(durationMs / 1000).toFixed(1)}s · ${tokens.toLocaleString("en-US")} tokens`);
      const savedId = record(context, "success", output);
      contextRef.current = null;
      setState((current) => ({ ...current, status: "success", output, durationMs, tokens, runId: savedId }));
    },
    [getEdges, getNodes, record, setEdges, setNodes, setStatus, settings.model, settings.temperature, source.name],
  );

  const stop = useCallback(() => {
    runRef.current++;
    setNodes((nodes) =>
      nodes.map((node) =>
        node.data.status === "running" ? { ...node, data: { ...node.data, status: "idle" } } : node,
      ),
    );
    setEdges((edges) =>
      edges.map((edge) =>
        edge.className === "af-edge-running" ? { ...edge, animated: false, className: undefined } : edge,
      ),
    );
    const context = contextRef.current;
    if (!context) return;
    const at = performance.now() - context.started;
    context.logs.push({ id: ++logSequence, at, level: "warn", message: "Run stopped by user." });
    const savedId = record(context, "cancelled", null, "Cancelled by user");
    contextRef.current = null;
    setState((current) => ({ ...current, status: "stopped", durationMs: at, logs: [...context.logs], runId: savedId }));
  }, [record, setEdges, setNodes]);

  const reset = useCallback(() => {
    runRef.current++;
    contextRef.current = null;
    clearVisuals();
    setState(idle);
  }, [clearVisuals]);

  return { state, run, stop, reset };
}
