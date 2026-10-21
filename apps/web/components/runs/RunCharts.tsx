"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/runs/format";
import type { Run } from "@/lib/runs/types";

/** Single-series horizontal bars with direct value labels. */
export function BarList({
  items,
  format,
  label,
}: {
  items: { id: string; label: string; value: number; failed?: boolean }[];
  format: (value: number) => string;
  label: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul aria-label={label} className="space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[minmax(0,10rem)_1fr_auto]">
          <span className="truncate text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full origin-left rounded-full animate-grow-x", item.failed ? "bg-danger" : "bg-primary")}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="w-14 text-right font-semibold tabular-nums">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Prompt vs. completion tokens as one stacked bar with a legend. */
export function TokenSplit({ prompt, completion }: { prompt: number; completion: number }) {
  const total = Math.max(prompt + completion, 1);
  const parts = [
    { label: "Prompt", value: prompt, className: "bg-primary" },
    { label: "Completion", value: completion, className: "bg-chart-completion" },
  ];
  return (
    <div>
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`Prompt ${prompt} tokens, completion ${completion} tokens`}
      >
        {parts.map((part) => (
          <span
            key={part.label}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", part.className)}
            style={{ width: `${(part.value / total) * 100}%` }}
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {parts.map((part) => (
          <div key={part.label}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2.5 rounded-sm", part.className)} />
              {part.label}
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums">
              {part.value.toLocaleString("en-US")}
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                {Math.round((part.value / total) * 100)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Duration of this run vs. recent runs of the same source. */
export function RecentRunsComparison({ runs, currentId }: { runs: Run[]; currentId: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...runs.map((run) => run.durationMs), 1);
  const finished = runs.filter((run) => run.status === "success");
  const average = finished.length ? finished.reduce((sum, run) => sum + run.durationMs, 0) / finished.length : 0;

  if (runs.length < 2) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Not enough history yet — run it again to compare.</p>;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Average successful run: <span className="font-semibold text-foreground">{formatDuration(average)}</span>
      </p>
      <div className="relative flex h-36 items-end gap-1.5 border-b border-border" onMouseLeave={() => setHovered(null)}>
        {runs.map((run, index) => {
          const current = run.id === currentId;
          return (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              aria-label={`${run.id}: ${formatDuration(run.durationMs)}, ${run.status}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "w-full max-w-6 origin-bottom rounded-t-[4px] animate-grow-y transition-opacity",
                  current ? "bg-primary" : "bg-input",
                  hovered !== null && hovered !== index && "opacity-50",
                )}
                style={{ height: `${Math.max((run.durationMs / max) * 100, 3)}%`, animationDelay: `${index * 30}ms` }}
              />
            </Link>
          );
        })}

        {hovered !== null && runs[hovered] && (
          <div
            role="status"
            className={cn(
              "pointer-events-none absolute top-0 z-10 w-40 rounded-xl border border-border bg-card p-2.5 text-xs shadow-xl shadow-black/10",
              hovered >= runs.length / 2 ? "-translate-x-full" : "",
            )}
            style={{ left: `${((hovered >= runs.length / 2 ? hovered : hovered + 1) / runs.length) * 100}%` }}
          >
            <p className="font-mono font-semibold">{runs[hovered].id}</p>
            <p className="mt-1 text-muted-foreground">
              {formatDuration(runs[hovered].durationMs)} · <span className="capitalize">{runs[hovered].status}</span>
            </p>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {runs.map((run) => (
          <span key={run.id} className="flex min-w-0 flex-1 justify-center">
            {run.status === "failed" && <span title="Failed" className="size-1.5 rounded-full bg-danger" />}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" />
          This run
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-input" />
          Other runs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-danger" />
          Failed
        </span>
      </div>
    </div>
  );
}
