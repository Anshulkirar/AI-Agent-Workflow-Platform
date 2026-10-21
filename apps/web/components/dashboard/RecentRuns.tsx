"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock3, Inbox } from "lucide-react";
import { RunSourceAvatar, RunStatusBadge } from "@/components/runs/RunVisuals";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/runs/format";
import { useRuns } from "@/lib/runs/store";
import type { RunStatus } from "@/lib/runs/types";
import { Card, CardHeader } from "./Card";

type Filter = "all" | Extract<RunStatus, "success" | "failed">;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const LIMIT = 5;

export function RecentRuns() {
  const [filter, setFilter] = useState<Filter>("all");
  const recent = useRuns().slice(0, 12);
  const runs = recent.filter((run) => filter === "all" || run.status === filter).slice(0, LIMIT);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Recent Runs"
        subtitle="Latest agent executions across your workspace"
        action={
          <Link href="/runs" className="group inline-flex items-center gap-1 text-xs font-semibold text-primary">
            View all
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

      <div role="tablist" aria-label="Filter runs" className="mb-3 flex gap-1.5">
        {filters.map((item) => {
          const count = item.value === "all" ? recent.length : recent.filter((run) => run.status === item.value).length;
          const active = filter === item.value;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
              <span className="rounded-md bg-card/70 px-1.5 text-[10px] tabular-nums ring-1 ring-border">{count}</span>
            </button>
          );
        })}
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Inbox size={22} />
          No runs match this filter.
        </div>
      ) : (
        <ul className="-mx-2 flex-1 divide-y divide-border">
          {runs.map((run, index) => (
            <li
              key={run.id}
              className="relative flex items-center gap-3 rounded-xl px-2 py-3.5 transition-colors animate-fade-in hover:bg-muted/60"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <RunSourceAvatar source={run.source} size="md" />

              <div className="min-w-0 flex-1">
                <Link
                  href={`/runs/${run.id}`}
                  className="block truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {run.source.name}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  <span className={run.status === "failed" ? "text-danger" : run.status === "success" ? "text-success" : undefined}>
                    {run.status === "success" ? "Completed" : run.status === "failed" ? "Failed" : run.status === "running" ? "Running" : "Cancelled"}
                  </span>
                  {" · "}
                  {run.input} · <RelativeTime iso={run.startedAt} />
                </p>
              </div>

              <RunStatusBadge status={run.status} />

              <span className="hidden w-14 shrink-0 items-center justify-end gap-1 text-xs tabular-nums text-muted-foreground sm:flex">
                <Clock3 size={12} aria-hidden />
                {formatDuration(run.durationMs)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
