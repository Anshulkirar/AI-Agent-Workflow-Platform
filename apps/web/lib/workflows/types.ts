import type { AgentColor, AgentIconKey, ModelSettings, Workflow } from "@/lib/agents/types";

export type WorkflowStatus = "active" | "paused" | "draft" | "archived";
export type TriggerType = "manual" | "schedule" | "webhook" | "event";

export type WorkflowTrigger = {
  type: TriggerType;
  schedule?: string;
  event?: string;
};

export type WorkflowRecord = {
  id: string;
  name: string;
  description: string;
  icon: AgentIconKey;
  color: AgentColor;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  tags: string[];
  graph: Workflow;
  settings: ModelSettings;
  runs: number;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowInput = Pick<
  WorkflowRecord,
  "name" | "description" | "icon" | "color" | "status" | "trigger" | "tags"
>;
