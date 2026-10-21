"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarClock, CircleX, Clock3, Coins, Flag, Timer } from "lucide-react";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { MarkdownLite } from "@/components/ui/MarkdownLite";
import { modelName } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration, triggerLabels } from "@/lib/runs/format";
import type { Run } from "@/lib/runs/types";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { StepStatusIcon, sourceHref, useSourceExists } from "./RunVisuals";

import type { RunTab } from "./run-tabs";

type OverviewProps = {
  run: Run;
  elapsedMs: number;
  onSelectStep: (stepId: string) => void;
  onTab: (tab: RunTab) => void;
  onRerun: () => void;
};

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Clock3; label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/[0.02]">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon size={13} />
        {label}
      </p>
      <p className="mt-2 text-base font-bold leading-snug tabular-nums tracking-tight sm:text-lg">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">{hint}</p>}
    </div>
  );
}

export function RunOverview({ run, elapsedMs, onSelectStep, onTab, onRerun }: OverviewProps) {
  const running = run.status === "running";
  const tokens = running ? run.steps.reduce((sum, step) => sum + step.tokens, 0) : run.promptTokens + run.completionTokens;
  const failedStep = run.steps.find((step) => step.status === "failed");
  const sourceExists = useSourceExists(run.source);

  return (
    <div className="space-y-6">
      {run.status === "failed" && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-start">
          <CircleX size={20} className="shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-danger">
              Run failed{failedStep ? ` at “${failedStep.name}”` : ""}
            </p>
            <p className="mt-1 text-sm text-foreground/80">{run.error}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {failedStep && (
              <button
                type="button"
                onClick={() => onSelectStep(failedStep.id)}
                className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-card"
              >
                Inspect step
              </button>
            )}
            <button type="button" onClick={onRerun} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger/90">
              Retry run
            </button>
          </div>
        </div>
      )}

      <section aria-label="Run summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CalendarClock} label="Started at" value={formatDateTime(run.startedAt)} />
        <Stat
          icon={Flag}
          label="Completed at"
          value={run.completedAt ? formatDateTime(run.completedAt) : running ? "In progress…" : "—"}
        />
        <Stat
          icon={Timer}
          label="Duration"
          value={formatDuration(running ? elapsedMs : run.durationMs)}
          hint={`${run.steps.filter((step) => step.status === "success").length} of ${run.steps.length} steps completed`}
        />
        <Stat
          icon={Coins}
          label="Tokens used"
          value={tokens.toLocaleString("en-US")}
          hint={running ? "Counting…" : `${run.promptTokens.toLocaleString("en-US")} prompt · ${run.completionTokens.toLocaleString("en-US")} completion`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Input" action={<CopyButton value={run.input} label="Copy input" />} />
            <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-6">{run.input}</p>
          </Card>

          <Card>
            <CardHeader
              title="Output"
              action={run.output ? <CopyButton value={run.output} label="Copy output" /> : undefined}
            />
            {run.output ? (
              <>
                <div className="relative max-h-56 overflow-hidden rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-6">
                  <MarkdownLite source={run.output} />
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-card to-transparent" />
                </div>
                <button
                  type="button"
                  onClick={() => onTab("io")}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View full output
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {running ? "Output will appear when the run finishes." : run.status === "failed" ? "No output — the run failed." : "No output — the run was cancelled."}
              </p>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Execution Steps"
            action={
              <button type="button" onClick={() => onTab("steps")} className="text-xs font-semibold text-primary hover:underline">
                Details
              </button>
            }
          />
          <ol className="relative space-y-1">
            {run.steps.map((step, index) => {
              const duration = step.status === "running" ? elapsedMs - step.startMs : step.durationMs;
              return (
                <li key={step.id} className="relative">
                  {index < run.steps.length - 1 && (
                    <span aria-hidden className="absolute left-[19px] top-9 h-[calc(100%-1.25rem)] w-px bg-border" />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectStep(step.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="relative z-10 flex size-5 items-center justify-center rounded-full bg-card">
                      <StepStatusIcon status={step.status} />
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", step.status === "pending" && "text-muted-foreground")}>
                      {step.name}
                    </span>
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                      {step.status === "pending" || (step.status === "skipped" && step.durationMs === 0) ? "—" : formatDuration(Math.max(duration, 0))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title="Execution Timeline" subtitle="When each step started and how long it took" />
        <ExecutionTimeline
          steps={run.steps}
          totalMs={run.durationMs}
          elapsedMs={running ? elapsedMs : undefined}
          onSelectStep={onSelectStep}
        />
      </Card>

      <Card>
        <CardHeader title="Run details" />
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Run ID", <span key="id" className="flex items-center gap-1 font-mono">{run.id}<CopyButton value={run.id} label="Copy run ID" className="p-1" /></span>],
            [
              run.source.type === "agent" ? "Agent" : "Workflow",
              sourceExists ? (
                <Link key="source" href={sourceHref(run.source)} className="font-medium text-primary hover:underline">
                  {run.source.name}
                </Link>
              ) : (
                <span key="source">{run.source.name} (deleted)</span>
              ),
            ],
            ["Trigger", triggerLabels[run.trigger]],
            ["Model", modelName(run.model)],
            ...(run.rerunOf
              ? [["Rerun of", <Link key="rerun" href={`/runs/${run.rerunOf}`} className="font-mono text-primary hover:underline">{run.rerunOf}</Link>]]
              : []),
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
