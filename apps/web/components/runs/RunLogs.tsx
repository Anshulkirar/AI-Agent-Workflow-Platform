"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Search, SearchX } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/cn";
import { downloadFile } from "@/lib/download";
import type { Run, RunLogLevel } from "@/lib/runs/types";

type LevelFilter = "all" | "info" | "debug" | "warn" | "error";

const filters: { value: LevelFilter; label: string; levels: RunLogLevel[] }[] = [
  { value: "all", label: "All", levels: ["debug", "info", "success", "warn", "error"] },
  { value: "info", label: "Info", levels: ["info", "success"] },
  { value: "debug", label: "Debug", levels: ["debug"] },
  { value: "warn", label: "Warnings", levels: ["warn"] },
  { value: "error", label: "Errors", levels: ["error"] },
];

const levelStyles: Record<RunLogLevel, string> = {
  debug: "text-subtle-foreground",
  info: "text-primary",
  success: "text-success",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-danger",
};

function offset(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = (ms % 60000) / 1000;
  return `+${String(minutes).padStart(2, "0")}:${seconds.toFixed(2).padStart(5, "0")}`;
}

export function RunLogs({ run, onSelectStep }: { run: Run; onSelectStep: (stepId: string) => void }) {
  const [filter, setFilter] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const stepNames = useMemo(() => new Map(run.steps.map((step) => [step.id, step.name])), [run.steps]);

  const levels = filters.find((item) => item.value === filter)!.levels;
  const term = query.trim().toLowerCase();
  const visible = run.logs.filter(
    (entry) => levels.includes(entry.level) && (!term || entry.message.toLowerCase().includes(term)),
  );

  const asText = run.logs
    .map((entry) => `${offset(entry.atMs)} ${entry.level.toUpperCase().padEnd(7)} ${entry.stepId ? `[${stepNames.get(entry.stepId)}] ` : ""}${entry.message}`)
    .join("\n");

  // Follow new lines while the run is live.
  useEffect(() => {
    if (run.status !== "running") return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [run.logs.length, run.status]);

  return (
    <section aria-label="Logs" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.02]">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {filters.map((item) => {
            const count = run.logs.filter((entry) => item.levels.includes(entry.level)).length;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  filter === item.value ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
                <span className="rounded bg-muted px-1 text-[10px] tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-card px-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 lg:w-64 lg:flex-none">
            <Search size={14} className="text-subtle-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search logs…"
              aria-label="Search logs"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
            />
          </label>
          <CopyButton value={asText} label="Copy logs" className="h-9 border border-border px-2.5" />
          <button
            type="button"
            onClick={() => downloadFile(`${run.id}.log`, asText)}
            aria-label="Download logs"
            title="Download logs"
            className="flex h-9 items-center rounded-lg border border-border px-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
          <SearchX size={20} />
          No log lines match.
        </div>
      ) : (
        <ol
          ref={listRef}
          aria-live={run.status === "running" ? "polite" : undefined}
          className="max-h-[560px] overflow-auto bg-muted/30 py-2 font-mono text-xs leading-6"
        >
          {visible.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "grid grid-cols-[5.5rem_4.5rem_1fr] gap-2 px-4 hover:bg-muted/70",
                entry.level === "error" && "bg-danger-soft/60",
              )}
            >
              <span className="tabular-nums text-subtle-foreground">{offset(entry.atMs)}</span>
              <span className={cn("font-semibold uppercase", levelStyles[entry.level])}>{entry.level}</span>
              <span className="min-w-0 break-words">
                {entry.stepId && (
                  <button
                    type="button"
                    onClick={() => onSelectStep(entry.stepId!)}
                    className="mr-2 rounded bg-primary-soft px-1.5 font-sans text-[10px] font-semibold text-primary-soft-foreground hover:underline"
                  >
                    {stepNames.get(entry.stepId) ?? entry.stepId}
                  </button>
                )}
                <span className={entry.level === "error" ? "text-danger" : undefined}>{entry.message}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
