import { CalendarClock, Hand, Webhook, Zap } from "lucide-react";
import { defaultSettings } from "@/lib/agents/catalog";
import type { Workflow } from "@/lib/agents/types";
import { graphFromSpec, type NodeSpec } from "@/lib/agents/workflow";
import type { TriggerType, WorkflowInput, WorkflowRecord, WorkflowStatus, WorkflowTrigger } from "./types";

export const emptyWorkflow: WorkflowInput = {
  name: "",
  description: "",
  icon: "sparkles",
  color: "violet",
  status: "active",
  trigger: { type: "manual" },
  tags: [],
};

export function toWorkflowInput(workflow: WorkflowRecord): WorkflowInput {
  const { name, description, icon, color, status, trigger, tags } = workflow;
  return { name, description, icon, color, status, trigger, tags };
}

export const workflowStatusMeta: Record<WorkflowStatus, { label: string; badge: string; dot: string }> = {
  active: { label: "Active", badge: "bg-success-soft text-success", dot: "bg-success" },
  paused: { label: "Paused", badge: "bg-muted text-muted-foreground", dot: "bg-subtle-foreground" },
  draft: { label: "Draft", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  archived: { label: "Archived", badge: "bg-muted text-subtle-foreground", dot: "bg-subtle-foreground" },
};

export const triggerMeta: Record<TriggerType, { label: string; description: string; icon: typeof Zap }> = {
  manual: { label: "Manual", description: "Run on demand from the app or API", icon: Hand },
  schedule: { label: "Schedule", description: "Run automatically on a schedule", icon: CalendarClock },
  webhook: { label: "Webhook", description: "Run when an HTTP request arrives", icon: Webhook },
  event: { label: "Event", description: "Run when something happens in a connected app", icon: Zap },
};

export const scheduleOptions = ["Every 15 minutes", "Every hour", "Every day at 09:00", "Every Monday at 09:00", "First day of the month"];
export const eventOptions = ["New email received", "New GitHub issue", "New Slack message in #support", "Form submitted", "New row in database"];

export function describeTrigger(trigger: WorkflowTrigger) {
  if (trigger.type === "schedule") return trigger.schedule ?? "Scheduled";
  if (trigger.type === "event") return trigger.event ?? "On event";
  if (trigger.type === "webhook") return "On webhook";
  return "Manual";
}

/* ----------------------------------------------------------------------------
 * Starter templates for new workflows
 * ------------------------------------------------------------------------- */

export type WorkflowTemplateId = "blank" | "sequential" | "parallel" | "router";

export const workflowTemplates: { id: WorkflowTemplateId; name: string; description: string }[] = [
  { id: "sequential", name: "Sequential agents", description: "Each agent hands its result to the next." },
  { id: "parallel", name: "Parallel agents", description: "Agents work at the same time, then results are merged." },
  { id: "router", name: "Router", description: "Classify the request and route it to the right agent." },
  { id: "blank", name: "Blank canvas", description: "Start with just an input and an output." },
];

type AgentRef = { id: string; name: string };

const input: NodeSpec = { id: "input", kind: "input", label: "User Input" };
const output: NodeSpec = { id: "output", kind: "output", label: "Output" };
const agentNode = (agent: AgentRef, index: number): NodeSpec => ({
  id: `agent-${index + 1}`,
  kind: "agent",
  label: agent.name,
  config: { agentId: agent.id },
});

/** Builds the starting graph for a new workflow from a template and chosen agents. */
export function buildTemplateGraph(template: WorkflowTemplateId, agents: AgentRef[]): Workflow {
  const settings = defaultSettings;
  const workers: NodeSpec[] = agents.length
    ? agents.map(agentNode)
    : [{ id: "llm", kind: "llm", label: "LLM Agent" }];

  switch (template) {
    case "blank":
      return graphFromSpec([input, output], [["input", "output"]], settings);
    case "sequential": {
      const chain = [input, ...workers, output];
      return graphFromSpec(
        chain,
        chain.slice(1).map((node, index) => [chain[index]!.id, node.id]),
        settings,
      );
    }
    case "parallel": {
      const merge: NodeSpec = { id: "merge", kind: "transform", label: "Merge results" };
      return graphFromSpec(
        [input, ...workers, merge, output],
        [...workers.flatMap((node) => [["input", node.id], [node.id, "merge"]] as [string, string][]), ["merge", "output"]],
        settings,
      );
    }
    case "router": {
      const classify: NodeSpec = { id: "classify", kind: "llm", label: "Classify request" };
      const route: NodeSpec = { id: "route", kind: "condition", label: "Route", config: { expression: "{{ intent }} == 'primary'" } };
      const [yes, no] = [workers[0]!, workers[1] ?? { id: "fallback", kind: "llm" as const, label: "Fallback answer" }];
      return graphFromSpec(
        [input, classify, route, yes, no, output],
        [["input", "classify"], ["classify", "route"], ["route", yes.id, "true"], ["route", no.id, "false"], [yes.id, "output"], [no.id, "output"]],
        settings,
      );
    }
  }
}
