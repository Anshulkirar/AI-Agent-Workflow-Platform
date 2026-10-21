"use client";

import { Ban, CircleCheck, CircleDashed, CircleX, LoaderCircle, MinusCircle } from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { useAgents } from "@/lib/agents/store";
import { cn } from "@/lib/cn";
import { runStatusMeta } from "@/lib/runs/format";
import type { RunSource, RunStatus, StepStatus } from "@/lib/runs/types";
import { useWorkflows } from "@/lib/workflows/store";

const statusIcons = {
  running: LoaderCircle,
  success: CircleCheck,
  failed: CircleX,
  cancelled: Ban,
};

export function RunStatusBadge({ status, className }: { status: RunStatus; className?: string }) {
  const meta = runStatusMeta[status];
  const Icon = statusIcons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold",
        meta.badge,
        className,
      )}
    >
      <Icon size={12} className={cn(status === "running" && "animate-spin")} aria-hidden />
      {meta.label}
    </span>
  );
}

export function StepStatusIcon({ status, className }: { status: StepStatus; className?: string }) {
  switch (status) {
    case "success":
      return <CircleCheck className={cn("size-4.5 text-success", className)} aria-label="Succeeded" />;
    case "failed":
      return <CircleX className={cn("size-4.5 text-danger", className)} aria-label="Failed" />;
    case "running":
      return <LoaderCircle className={cn("size-4.5 animate-spin text-primary", className)} aria-label="Running" />;
    case "skipped":
      return <MinusCircle className={cn("size-4.5 text-subtle-foreground", className)} aria-label="Skipped" />;
    default:
      return <CircleDashed className={cn("size-4.5 text-subtle-foreground", className)} aria-label="Pending" />;
  }
}

export function sourceHref(source: RunSource) {
  return source.type === "agent" ? `/agents/${source.id}/builder` : `/workflows/${source.id}/builder`;
}

/** Avatar for the agent/workflow that produced a run (falls back if it was deleted). */
export function RunSourceAvatar({ source, size = "sm" }: { source: RunSource; size?: "sm" | "md" }) {
  const agents = useAgents();
  const workflows = useWorkflows();
  const entity =
    source.type === "agent"
      ? agents.find((agent) => agent.id === source.id)
      : workflows.find((workflow) => workflow.id === source.id);
  return (
    <AgentAvatar
      icon={entity?.icon ?? (source.type === "agent" ? "bot" : "sparkles")}
      color={entity?.color ?? "violet"}
      size={size}
    />
  );
}

/** Whether the source still exists (deleted sources aren't linked). */
export function useSourceExists(source: RunSource) {
  const agents = useAgents();
  const workflows = useWorkflows();
  return source.type === "agent"
    ? agents.some((agent) => agent.id === source.id)
    : workflows.some((workflow) => workflow.id === source.id);
}
