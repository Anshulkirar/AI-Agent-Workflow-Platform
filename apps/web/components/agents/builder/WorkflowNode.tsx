"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CircleCheck, CircleX, LoaderCircle, MinusCircle } from "lucide-react";
import { agentColors, agentIcons, getNodeVisual, modelName } from "@/lib/agents/catalog";
import { useAgent } from "@/lib/agents/store";
import type { NodeRunStatus } from "@/lib/agents/types";
import { NODE_WIDTH } from "@/lib/agents/workflow";
import { cn } from "@/lib/cn";
import type { AppNode } from "./types";

function StatusIcon({ status }: { status: NodeRunStatus }) {
  switch (status) {
    case "running":
      return <LoaderCircle className="size-4 animate-spin text-primary" aria-label="Running" />;
    case "success":
      return <CircleCheck className="size-4 text-success" aria-label="Succeeded" />;
    case "error":
      return <CircleX className="size-4 text-danger" aria-label="Failed" />;
    case "skipped":
      return <MinusCircle className="size-4 text-subtle-foreground" aria-label="Skipped" />;
    default:
      return null;
  }
}

function WorkflowNodeComponent({ data, selected }: NodeProps<AppNode>) {
  const linked = useAgent(data.kind === "agent" ? String(data.config.agentId ?? "") : "");
  const visual =
    data.kind === "agent"
      ? linked
        ? { icon: agentIcons[linked.icon].icon, tone: agentColors[linked.color].tile, subtitle: `Agent · ${modelName(linked.settings.model)}` }
        : { ...getNodeVisual(data), subtitle: "Agent · choose one" }
      : getNodeVisual(data);
  const Icon = visual.icon;
  const status = data.status ?? "idle";
  const isCondition = data.kind === "condition";

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={cn(
        "relative rounded-2xl border bg-card px-3 py-2.5 shadow-sm transition-[border-color,box-shadow,opacity] duration-300",
        selected ? "border-primary ring-4 ring-primary/15" : "border-border hover:border-primary/40 hover:shadow-md",
        status === "running" && "border-primary shadow-lg shadow-primary/25 ring-4 ring-primary/20",
        status === "success" && !selected && "border-success/60",
        status === "error" && "border-danger ring-4 ring-danger/15",
        status === "skipped" && "opacity-45",
      )}
    >
      {status === "running" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary/40 animate-pulse" />
      )}

      {data.kind !== "input" && <Handle type="target" position={Position.Top} />}

      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", visual.tone)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">{data.label}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{visual.subtitle}</p>
        </div>
        <StatusIcon status={status} />
      </div>

      {isCondition ? (
        <>
          <div className="mt-2 flex justify-between px-6 text-[10px] font-semibold">
            <span className="text-success">Yes</span>
            <span className="text-danger">No</span>
          </div>
          <Handle id="true" type="source" position={Position.Bottom} style={{ left: "25%" }} />
          <Handle id="false" type="source" position={Position.Bottom} style={{ left: "75%" }} />
        </>
      ) : (
        data.kind !== "output" && <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
