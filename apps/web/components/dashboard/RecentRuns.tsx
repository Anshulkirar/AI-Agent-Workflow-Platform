"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleCheck, CircleX, Clock3, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { recentRuns, type RunStatus } from "@/lib/mock-data";
import { Card, CardHeader } from "./Card";

type Filter = "all" | RunStatus;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

function StatusBadge({ status }: { status: RunStatus }) {
  const success = status === "success";
  const Icon = success ? CircleCheck : CircleX;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold",
        success ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <Icon size={12} aria-hidden />
      {success ? "Success" : "Failed"}
    </span>
  );
}

export function RecentRuns() {
  const [filter, setFilter] = useState<Filter>("all");
  const runs = recentRuns.filter((run) => filter === "all" || run.status === filter);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Recent Runs"
        subtitle="Latest agent executions across your workspace"
        action={
          <Link
            href="/runs"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            View all
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

      <div role="tablist" aria-label="Filter runs" className="mb-3 flex gap-1.5">
        {filters.map((item) => {
          const count =
            item.value === "all"
              ? recentRuns.length
              : recentRuns.filter((run) => run.status === item.value).length;
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
                active
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
              <span className="rounded-md bg-card/70 px-1.5 text-[10px] tabular-nums ring-1 ring-border">
                {count}
              </span>
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
          {runs.map((run, index) => {
            const Icon = run.icon;
            return (
              <li
                key={run.id}
                className="flex items-center gap-3 rounded-xl px-2 py-3.5 transition-colors animate-fade-in hover:bg-muted/60"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    run.iconClass,
                  )}
                >
                  <Icon size={18} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{run.agent}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className={run.status === "success" ? "text-success" : "text-danger"}>
                      {run.status === "success" ? "Completed" : "Failed"}
                    </span>
                    {" · "}
                    {run.task} · {run.time}
                  </p>
                </div>

                <StatusBadge status={run.status} />

                <span className="hidden w-14 shrink-0 items-center justify-end gap-1 text-xs tabular-nums text-muted-foreground sm:flex">
                  <Clock3 size={12} aria-hidden />
                  {run.duration}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
