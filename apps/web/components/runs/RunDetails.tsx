"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy, Download, ExternalLink, LoaderCircle, RotateCcw, Share2, Square, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CopyButton, copyText } from "@/components/ui/CopyButton";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { useHydrated } from "@/components/ui/use-hydrated";
import { useNow } from "@/components/ui/use-now";
import { cn } from "@/lib/cn";
import { downloadFile } from "@/lib/download";
import { formatDuration, triggerLabels } from "@/lib/runs/format";
import { recordSourceRun } from "@/lib/runs/record";
import { cancelRun, rerun } from "@/lib/runs/simulator";
import { runStore, useRun } from "@/lib/runs/store";
import type { Run } from "@/lib/runs/types";
import { toast } from "@/lib/toast";
import { RunInputOutput } from "./RunInputOutput";
import { RunLogs } from "./RunLogs";
import { RunMetrics } from "./RunMetrics";
import { RunOverview } from "./RunOverview";
import { runTabs as tabs, type RunTab } from "./run-tabs";
import { RunSteps } from "./RunSteps";
import { RunSourceAvatar, RunStatusBadge, sourceHref, useSourceExists } from "./RunVisuals";


export function RunDetailsPage({ id, initialTab }: { id: string; initialTab?: RunTab }) {
  const hydrated = useHydrated();
  const run = useRun(id);

  if (!hydrated) {
    return (
      <div aria-busy="true" aria-label="Loading run" className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center animate-fade-in">
        <h1 className="text-lg font-semibold">Run not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">It may have been deleted, or the link is incorrect.</p>
        <Link href="/runs" className={buttonVariants({ variant: "secondary", className: "mt-6" })}>
          <ArrowLeft size={16} />
          Back to runs
        </Link>
      </div>
    );
  }

  return <RunDetails key={run.id} run={run} initialTab={initialTab} />;
}

function RunDetails({ run, initialTab = "overview" }: { run: Run; initialTab?: RunTab }) {
  const router = useRouter();
  const [tab, setTabState] = useState<RunTab>(initialTab);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(run.steps.filter((step) => step.status === "failed").map((step) => step.id)),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const running = run.status === "running";
  const now = useNow(running, 200);
  const elapsedMs = running ? now - new Date(run.startedAt).getTime() : run.durationMs;
  const sourceExists = useSourceExists(run.source);
  const current = run.steps.find((step) => step.status === "running");
  const completed = run.steps.filter((step) => step.status === "success").length;

  const setTab = (next: RunTab) => {
    setTabState(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const selectStep = (stepId: string) => {
    setExpanded(new Set([stepId]));
    setTab("steps");
  };

  const handleRerun = () => {
    const id = rerun(run, (finished) => {
      recordSourceRun(finished);
      toast({ title: "Rerun finished", description: `${finished.id} completed in ${formatDuration(finished.durationMs)}.` });
    });
    toast({ tone: "info", title: "Rerun started", description: `${id} is re-executing ${run.source.name}.` });
    router.push(`/runs/${id}`);
  };

  const share = async () => {
    if (await copyText(window.location.href)) toast({ tone: "info", title: "Link copied", description: "Anyone in your workspace can open this run." });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up lg:flex-row lg:items-end">
        <div className="min-w-0">
          <Breadcrumbs items={[{ label: "Runs", href: "/runs" }, { label: run.id }]} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Run Details</h1>
            <RunStatusBadge status={run.status} className="text-xs" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center font-mono text-xs">
              {run.id}
              <CopyButton value={run.id} label="Copy run ID" className="p-1" />
            </span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-2">
              <RunSourceAvatar source={run.source} />
              {sourceExists ? (
                <Link href={sourceHref(run.source)} className="font-medium text-foreground hover:text-primary">
                  {run.source.name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{run.source.name}</span>
              )}
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] capitalize">{run.source.type}</span>
            </span>
            <span aria-hidden>·</span>
            <span>{triggerLabels[run.trigger]}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={() => {
                cancelRun(run.id);
                toast({ tone: "info", title: "Run cancelled" });
              }}
              className={buttonVariants({ variant: "secondary", className: "text-danger" })}
            >
              <Square size={14} className="fill-current" />
              Cancel run
            </button>
          ) : (
            <button type="button" onClick={handleRerun} className={buttonVariants()}>
              <RotateCcw size={16} />
              Rerun
            </button>
          )}
          <button type="button" onClick={share} className={buttonVariants({ variant: "secondary" })}>
            <Share2 size={16} />
            Share
          </button>
          <DropdownMenu
            label="More run actions"
            items={[
              {
                label: "Download JSON",
                icon: Download,
                onSelect: () => downloadFile(`${run.id}.json`, JSON.stringify(run, null, 2), "application/json"),
              },
              { label: "Copy run ID", icon: Copy, onSelect: () => void copyText(run.id) },
              ...(sourceExists
                ? [{ label: `Open ${run.source.type}`, icon: ExternalLink, onSelect: () => router.push(sourceHref(run.source)) }]
                : []),
              "separator" as const,
              { label: "Delete run", icon: Trash2, danger: true, disabled: running, onSelect: () => setConfirmDelete(true) },
            ]}
          />
        </div>
      </header>

      {running && (
        <div className="rounded-2xl border border-primary/30 bg-primary-soft/60 p-4 animate-fade-in" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="flex min-w-0 items-center gap-2 font-medium text-primary-soft-foreground">
              <LoaderCircle size={16} className="shrink-0 animate-spin" />
              <span className="truncate">
                Step {Math.min(completed + 1, run.steps.length)} of {run.steps.length}
                {current ? ` · ${current.name}` : ""}
              </span>
            </p>
            <span className="shrink-0 font-semibold tabular-nums text-primary-soft-foreground">{formatDuration(elapsedMs)}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${((completed + (current ? 0.5 : 0)) / run.steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div role="tablist" aria-label="Run sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
        {tabs.map((item) => {
          const count = item.id === "logs" ? run.logs.length : item.id === "steps" ? run.steps.length : null;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={active}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3 pb-3 pt-1 text-sm font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {count !== null && (
                <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", active ? "bg-primary-soft" : "bg-muted")}>
                  {count}
                </span>
              )}
              {active && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      <div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="animate-fade-in">
        {tab === "overview" && (
          <RunOverview run={run} elapsedMs={elapsedMs} onSelectStep={selectStep} onTab={setTab} onRerun={handleRerun} />
        )}
        {tab === "logs" && <RunLogs run={run} onSelectStep={selectStep} />}
        {tab === "steps" && (
          <RunSteps
            run={run}
            elapsedMs={elapsedMs}
            expanded={expanded}
            onToggle={(stepId) =>
              setExpanded((currentSet) => {
                const next = new Set(currentSet);
                if (next.has(stepId)) next.delete(stepId);
                else next.add(stepId);
                return next;
              })
            }
            onExpandAll={(open) => setExpanded(open ? new Set(run.steps.map((step) => step.id)) : new Set())}
          />
        )}
        {tab === "io" && <RunInputOutput run={run} />}
        {tab === "metrics" && <RunMetrics run={run} elapsedMs={elapsedMs} />}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${run.id}?`}
        description="The run, its logs and output will be removed. You can undo right after."
        confirmLabel="Delete run"
        onConfirm={() => {
          const removed = runStore.remove(run.id);
          router.push("/runs");
          if (removed) {
            toast({
              title: "Run deleted",
              description: `${run.id} was removed.`,
              action: { label: "Undo", onClick: () => runStore.restore(removed.item, removed.index) },
            });
          }
        }}
      />
    </div>
  );
}
