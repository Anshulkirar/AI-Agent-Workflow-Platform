"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, CircleX } from "lucide-react";
import { getNodeVisual, toolsById } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/runs/format";
import type { Run, RunStep } from "@/lib/runs/types";
import { StepStatusIcon } from "./RunVisuals";

/** Pending, or skipped before it started. */
const notRun = (step: RunStep) => step.status === "pending" || (step.status === "skipped" && step.durationMs === 0);

function kindLabel(step: RunStep) {
  if (step.kind === "system") return "System";
  if (step.kind === "tool") return `Tool · ${toolsById.get(step.toolId ?? "")?.name ?? "Custom"}`;
  return getNodeVisual({ kind: step.kind }).subtitle;
}

export function RunSteps({
  run,
  elapsedMs,
  expanded,
  onToggle,
  onExpandAll,
}: {
  run: Run;
  elapsedMs: number;
  expanded: Set<string>;
  onToggle: (stepId: string) => void;
  onExpandAll: (open: boolean) => void;
}) {
  const refs = useRef(new Map<string, HTMLLIElement>());
  const allOpen = run.steps.every((step) => expanded.has(step.id));

  // Bring a step selected from elsewhere (timeline, logs) into view.
  const focusId = expanded.size === 1 ? [...expanded][0] : undefined;
  useEffect(() => {
    if (focusId) refs.current.get(focusId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  return (
    <section aria-label="Steps" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {run.steps.length} steps · {run.steps.filter((step) => step.kind === "tool").length} tool calls
        </p>
        <button type="button" onClick={() => onExpandAll(!allOpen)} className="text-xs font-semibold text-primary hover:underline">
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <ol className="space-y-2">
        {run.steps.map((step, index) => {
          const open = expanded.has(step.id);
          const duration = step.status === "running" ? elapsedMs - step.startMs : step.durationMs;
          const panelId = `step-panel-${step.id}`;
          return (
            <li
              key={step.id}
              ref={(node) => {
                if (node) refs.current.set(step.id, node);
                else refs.current.delete(step.id);
              }}
              className={cn(
                "scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm shadow-black/[0.02] transition-colors",
                step.status === "failed" ? "border-danger/40" : open ? "border-primary/40" : "border-border",
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggle(step.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40"
              >
                <StepStatusIcon status={step.status} />
                <span className="w-5 shrink-0 text-xs tabular-nums text-subtle-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{step.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{kindLabel(step)}</span>
                </span>
                <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                  {step.tokens.toLocaleString("en-US")} tokens
                </span>
                <span className="w-14 text-right text-xs font-semibold tabular-nums">
                  {notRun(step) ? "—" : formatDuration(Math.max(duration, 0))}
                </span>
                <ChevronDown size={16} className={cn("shrink-0 text-subtle-foreground transition-transform", open && "rotate-180")} />
              </button>

              {open && (
                <div id={panelId} className="space-y-4 border-t border-border px-4 py-4 animate-fade-in">
                  {step.error && (
                    <p className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                      <CircleX size={16} className="mt-0.5 shrink-0" />
                      {step.error}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      ["Input", step.input || "—"],
                      ["Output", step.output || (step.status === "running" ? "Running…" : step.status === "pending" ? "Not started yet" : "—")],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">{label}</p>
                        <pre className="min-h-16 whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/40 px-3 py-2.5 font-mono text-xs leading-5">
                          {value}
                        </pre>
                      </div>
                    ))}
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    {[
                      ["Started", `+${formatDuration(step.startMs)}`],
                      ["Duration", notRun(step) ? "—" : formatDuration(Math.max(duration, 0))],
                      ["Tokens", step.tokens.toLocaleString("en-US")],
                      ["Status", step.status],
                    ].map(([label, value]) => (
                      <div key={label} className="flex gap-1.5">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-semibold capitalize tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
