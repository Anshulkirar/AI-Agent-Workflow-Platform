"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/runs/format";
import type { RunStep } from "@/lib/runs/types";
import { StepStatusIcon } from "./RunVisuals";

/**
 * Gantt-style view of when each step ran. Bars are positioned by start
 * offset and sized by duration; the running step grows live.
 */
export function ExecutionTimeline({
  steps,
  totalMs,
  elapsedMs,
  onSelectStep,
}: {
  steps: RunStep[];
  totalMs: number;
  /** Live elapsed time while the run is in progress. */
  elapsedMs?: number;
  onSelectStep?: (stepId: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const span = Math.max(totalMs, elapsedMs ?? 0, 1000);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
        <span />
        <div aria-hidden className="relative h-5 text-[10px] tabular-nums text-subtle-foreground">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn(
                "absolute top-0",
                tick === 0 ? "translate-x-0" : tick === 1 ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{ left: `${tick * 100}%` }}
            >
              {formatDuration(span * tick)}
            </span>
          ))}
        </div>
      </div>

      <ol aria-label="Execution timeline" className="space-y-1.5">
        {steps.map((step, index) => {
          const running = step.status === "running";
          const duration = running && elapsedMs !== undefined ? Math.max(elapsedMs - step.startMs, 0) : step.durationMs;
          const visible = step.status !== "pending" && !(step.status === "skipped" && duration === 0);
          const left = (step.startMs / span) * 100;
          const width = Math.max((duration / span) * 100, 0.8);
          const isHovered = hovered === step.id;

          return (
            <li key={step.id} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <button
                type="button"
                onClick={() => onSelectStep?.(step.id)}
                className="flex min-w-0 items-center gap-2 rounded-md text-left text-xs hover:text-primary"
              >
                <StepStatusIcon status={step.status} className="size-3.5 shrink-0" />
                <span className="w-4 shrink-0 tabular-nums text-subtle-foreground">{index + 1}</span>
                <span className="truncate font-medium">{step.name}</span>
              </button>

              <div className="relative h-7 rounded-md bg-muted/50">
                {ticks.slice(1, -1).map((tick) => (
                  <span key={tick} aria-hidden className="absolute inset-y-0 w-px bg-border" style={{ left: `${tick * 100}%` }} />
                ))}
                {visible ? (
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(step.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(step.id)}
                    onBlur={() => setHovered(null)}
                    onClick={() => onSelectStep?.(step.id)}
                    aria-label={`${step.name}: started at ${formatDuration(step.startMs)}, took ${formatDuration(duration)}`}
                    className={cn(
                      "absolute inset-y-1 rounded-[4px] transition-[width,opacity] duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                      step.status === "failed"
                        ? "bg-danger"
                        : step.status === "skipped"
                          ? "border border-dashed border-subtle-foreground bg-transparent"
                          : "bg-primary",
                      running && "animate-pulse",
                      hovered && !isHovered && "opacity-40",
                    )}
                    style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                  />
                ) : (
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-subtle-foreground">
                    {step.status === "pending" ? "Waiting…" : "Skipped"}
                  </span>
                )}

                {isHovered && (
                  <div
                    role="tooltip"
                    className={cn(
                      "pointer-events-none absolute bottom-full z-10 mb-2 w-48 rounded-xl border border-border bg-card p-3 text-xs shadow-xl shadow-black/10 animate-fade-in",
                      left > 55 ? "-translate-x-full" : "",
                    )}
                    style={{ left: `${left > 55 ? left + width : left}%` }}
                  >
                    <p className="font-semibold">{step.name}</p>
                    <dl className="mt-1.5 space-y-1 text-muted-foreground">
                      {[
                        ["Started", `+${formatDuration(step.startMs)}`],
                        ["Duration", formatDuration(duration)],
                        ["Tokens", step.tokens.toLocaleString("en-US")],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between">
                          <dt>{label}</dt>
                          <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
