import { cn } from "@/lib/cn";
import { describeTrigger, triggerMeta, workflowStatusMeta } from "@/lib/workflows/catalog";
import type { WorkflowStatus, WorkflowTrigger } from "@/lib/workflows/types";

export function WorkflowStatusBadge({ status, className }: { status: WorkflowStatus; className?: string }) {
  const meta = workflowStatusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot, status === "active" && "animate-pulse")} />
      {meta.label}
    </span>
  );
}

export function TriggerLabel({ trigger, className }: { trigger: WorkflowTrigger; className?: string }) {
  const Icon = triggerMeta[trigger.type].icon;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{describeTrigger(trigger)}</span>
    </span>
  );
}

/** Success-rate meter with its value. */
export function SuccessMeter({ value, runs }: { value: number; runs: number }) {
  if (!runs) return <span className="text-xs text-subtle-foreground">—</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", value >= 90 ? "bg-success" : "bg-amber-500")} style={{ width: `${value}%` }} />
      </span>
      <span className="text-xs font-semibold tabular-nums">{value.toFixed(value % 1 ? 1 : 0)}%</span>
    </span>
  );
}
