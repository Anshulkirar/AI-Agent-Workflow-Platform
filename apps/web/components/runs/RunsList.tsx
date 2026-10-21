"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Activity, CircleCheck, Coins, Search, SearchX, Timer, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatTile } from "@/components/ui/PageKit";
import { Select } from "@/components/ui/Field";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useNow } from "@/components/ui/use-now";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { formatDuration, triggerLabels } from "@/lib/runs/format";
import { useRuns } from "@/lib/runs/store";
import type { RunSourceType, RunStatus } from "@/lib/runs/types";
import { RunSourceAvatar, RunStatusBadge } from "./RunVisuals";

type StatusFilter = "all" | RunStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 25;
const columns = "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_110px_90px_80px_80px_110px]";

export function RunsList({ initialSource }: { initialSource?: string }) {
  const runs = useRuns();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<"all" | RunSourceType>("all");
  const [sourceId, setSourceId] = useState<string | null>(initialSource ?? null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const term = useDeferredValue(query.trim().toLowerCase());
  const now = useNow(runs.some((run) => run.status === "running"), 500);

  const clearSource = () => {
    setSourceId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("source");
    window.history.replaceState(null, "", url);
  };

  // Everything except the status tab, so tab counts reflect the other filters.
  const scoped = useMemo(
    () =>
      runs.filter(
        (run) =>
          (type === "all" || run.source.type === type) &&
          (!sourceId || run.source.id === sourceId) &&
          (!term || `${run.id} ${run.source.name} ${run.input}`.toLowerCase().includes(term)),
      ),
    [runs, sourceId, term, type],
  );
  const visible = scoped.filter((run) => status === "all" || run.status === status);
  const sourceName = sourceId ? runs.find((run) => run.source.id === sourceId)?.source.name ?? sourceId : null;

  const finished = scoped.filter((run) => run.status === "success" || run.status === "failed");
  const successRate = finished.length ? (finished.filter((run) => run.status === "success").length / finished.length) * 100 : 0;
  const avgDuration = finished.length ? finished.reduce((sum, run) => sum + run.durationMs, 0) / finished.length : 0;
  const totalTokens = scoped.reduce((sum, run) => sum + run.promptTokens + run.completionTokens, 0);

  const stats = [
    { label: "Total runs", value: scoped.length.toLocaleString("en-US"), icon: Activity, tone: "bg-primary-soft text-primary-soft-foreground" },
    { label: "Success rate", value: `${successRate.toFixed(1)}%`, icon: CircleCheck, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Avg. duration", value: formatDuration(avgDuration), icon: Timer, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    { label: "Tokens used", value: formatCompact(totalTokens), icon: Coins, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Runs</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Every execution of your agents and workflows, with full traces.</p>
      </header>

      <section aria-label="Run statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatTile key={stat.label} index={index} {...stat} />
        ))}
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {statusFilters.map((item) => {
            const count = item.value === "all" ? scoped.length : scoped.filter((run) => run.status === item.value).length;
            const active = status === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatus(item.value);
                  setLimit(PAGE_SIZE);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.value === "running" && count > 0 && <span className="size-1.5 animate-pulse rounded-full bg-primary" />}
                {item.label}
                <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", active ? "bg-card/70" : "bg-muted")}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 lg:w-72 lg:flex-none">
            <Search size={15} className="shrink-0 text-subtle-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by ID, source or input…"
              aria-label="Search runs"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
            />
          </label>
          <Select
            aria-label="Filter by source type"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="w-36 shrink-0"
          >
            <option value="all">All sources</option>
            <option value="agent">Agents</option>
            <option value="workflow">Workflows</option>
          </Select>
        </div>
      </div>

      {sourceName && (
        <div className="flex items-center gap-2 text-sm animate-fade-in">
          <span className="text-muted-foreground">Showing runs of</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary-soft py-1 pl-2.5 pr-1 font-semibold text-primary-soft-foreground">
            {sourceName}
            <button type="button" onClick={clearSource} aria-label="Clear source filter" className="rounded p-0.5 hover:bg-card/60">
              <X size={13} />
            </button>
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center animate-fade-in">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX size={22} />
          </span>
          <h2 className="mt-4 font-semibold">No runs found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Try a different filter, or run an agent to see its trace here.</p>
          <Link href="/agents" className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-5" })}>
            Go to agents
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.02]">
          <div className={cn("hidden gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground md:grid", columns)}>
            <span>Run</span>
            <span>Source</span>
            <span>Status</span>
            <span>Trigger</span>
            <span className="text-right">Duration</span>
            <span className="text-right">Tokens</span>
            <span className="text-right">Started</span>
          </div>
          <ul className="divide-y divide-border">
            {visible.slice(0, limit).map((run) => {
              const duration = run.status === "running" ? now - new Date(run.startedAt).getTime() : run.durationMs;
              return (
                <li
                  key={run.id}
                  className={cn("group relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5", columns)}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-mono text-sm font-semibold outline-none after:absolute after:inset-0 group-hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                    >
                      {run.id}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{run.input}</p>
                  </div>
                  <div className="col-start-1 flex min-w-0 items-center gap-2 md:col-start-auto">
                    <RunSourceAvatar source={run.source} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{run.source.name}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">{run.source.type}</p>
                    </div>
                  </div>
                  <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                    <RunStatusBadge status={run.status} />
                  </div>
                  <span className="hidden text-xs text-muted-foreground md:block">{triggerLabels[run.trigger]}</span>
                  <span className="col-start-2 row-start-2 text-right text-xs font-medium tabular-nums md:col-start-auto md:row-start-auto md:text-sm">
                    {formatDuration(duration)}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
                    {formatCompact(run.promptTokens + run.completionTokens)}
                  </span>
                  <span className="hidden text-right text-xs text-muted-foreground md:block">
                    <RelativeTime iso={run.startedAt} />
                  </span>
                </li>
              );
            })}
          </ul>
          {visible.length > limit && (
            <div className="border-t border-border p-3 text-center">
              <button type="button" onClick={() => setLimit((value) => value + PAGE_SIZE)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Show more ({visible.length - limit} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
