import type { WorkflowNodeKind } from "@/lib/agents/types";

export type RunStatus = "running" | "success" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "success" | "failed" | "skipped";
export type RunTrigger = "manual" | "api" | "schedule" | "webhook" | "test" | "rerun";
export type RunLogLevel = "debug" | "info" | "success" | "warn" | "error";
export type RunSourceType = "agent" | "workflow";

export type RunSource = { type: RunSourceType; id: string; name: string };

export type StepKind = WorkflowNodeKind | "system";

export type RunStep = {
  id: string;
  name: string;
  kind: StepKind;
  toolId?: string;
  status: StepStatus;
  /** Offset from run start. */
  startMs: number;
  durationMs: number;
  tokens: number;
  input: string;
  output: string;
  error?: string;
};

export type RunLog = {
  id: number;
  /** Offset from run start. */
  atMs: number;
  level: RunLogLevel;
  message: string;
  stepId?: string;
};

export type Run = {
  id: string;
  source: RunSource;
  status: RunStatus;
  trigger: RunTrigger;
  model: string;
  input: string;
  output: string | null;
  error?: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  steps: RunStep[];
  logs: RunLog[];
  /** Set when this run re-executes another one. */
  rerunOf?: string;
};

/** Blueprint for one step, used by seeds and the simulator. */
export type StepTemplate = {
  name: string;
  kind: StepKind;
  toolId?: string;
  seconds: number;
  tokens: number;
  input?: string;
  output: string;
  /** Extra debug lines logged while the step runs. */
  details?: string[];
};
